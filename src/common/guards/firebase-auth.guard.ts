import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private firebase: FirebaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Missing authentication token');

    try {
      const decoded = await this.firebase.auth.verifyIdToken(token);
      const user = await this.prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
      if (!user) throw new UnauthorizedException('User not found');
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session. Please log in again.');
    }
  }
}
