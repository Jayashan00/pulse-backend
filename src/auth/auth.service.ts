import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, SignUpDto } from './dto/auth.dto';

const IDENTITY_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';

@Injectable()
export class AuthService {
  constructor(
    private firebase: FirebaseService,
    private prisma: PrismaService,
  ) {}

  /** Creates the Firebase Auth user + the PostgreSQL profile row, then signs in. */
  async signUp(dto: SignUpDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'This email is already registered' : 'This username is taken',
      );
    }

    let fbUser;
    try {
      fbUser = await this.firebase.auth.createUser({
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName,
      });
    } catch (e: any) {
      if (e.code === 'auth/email-already-exists') throw new ConflictException('This email is already registered');
      if (e.code === 'auth/weak-password') throw new BadRequestException('Password is too weak');
      throw new BadRequestException(e.message || 'Could not create account');
    }

    const user = await this.prisma.user.create({
      data: {
        firebaseUid: fbUser.uid,
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
      },
    });

    await this.prisma.notification.create({
      data: { userId: user.id, type: 'system', message: 'Welcome to Pulse! Create your first post to get started. 🎉' },
    });

    const session = await this.passwordSignIn(dto.email, dto.password);
    return { user, ...session };
  }

  /** Verifies email + password against Firebase and returns the ID token session. */
  async login(dto: LoginDto) {
    const session = await this.passwordSignIn(dto.email, dto.password);
    const decoded = await this.firebase.auth.verifyIdToken(session.idToken);
    const user = await this.prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) throw new UnauthorizedException('Account profile not found');
    return { user, ...session };
  }

  /** Revokes all refresh tokens for the user (server-side logout). */
  async logout(firebaseUid: string) {
    await this.firebase.auth.revokeRefreshTokens(firebaseUid);
    return { success: true, message: 'Logged out' };
  }

  private async passwordSignIn(email: string, password: string) {
    try {
      const { data } = await axios.post(
        `${IDENTITY_URL}?key=${process.env.FIREBASE_WEB_API_KEY}`,
        { email, password, returnSecureToken: true },
      );
      return { idToken: data.idToken as string, refreshToken: data.refreshToken as string, expiresIn: data.expiresIn as string };
    } catch (e: any) {
      const code = e?.response?.data?.error?.message || '';
      if (code.includes('INVALID_LOGIN_CREDENTIALS') || code.includes('INVALID_PASSWORD') || code.includes('EMAIL_NOT_FOUND')) {
        throw new UnauthorizedException('Invalid email or password');
      }
      if (code.includes('TOO_MANY_ATTEMPTS')) {
        throw new UnauthorizedException('Too many attempts. Try again later.');
      }
      throw new UnauthorizedException('Sign-in failed. Please try again.');
    }
  }
}
