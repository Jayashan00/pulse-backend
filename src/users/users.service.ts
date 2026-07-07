import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUser = { id: true, username: true, displayName: true, bio: true, avatarUrl: true, createdAt: true };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async search(q: string) {
    if (!q?.trim()) return [];
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { ...publicUser, _count: { select: { posts: true } } },
      take: 20,
    });
  }

  async getByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { ...publicUser, _count: { select: { posts: true, likes: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id: userId }, data: dto, select: publicUser });
  }

  async getPosts(username: string, viewerId: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');
    const posts = await this.prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' },
      include: this.postInclude(viewerId),
    });
    return posts.map((p) => this.shape(p));
  }

  async getSaved(viewerId: string) {
    const saves = await this.prisma.save.findMany({
      where: { userId: viewerId },
      orderBy: { createdAt: 'desc' },
      include: { post: { include: this.postInclude(viewerId) } },
    });
    return saves.map((s) => this.shape(s.post));
  }

  private postInclude(viewerId: string) {
    return {
      author: { select: publicUser },
      _count: { select: { likes: true, comments: true, saves: true } },
      likes: { where: { userId: viewerId }, select: { id: true } },
      saves: { where: { userId: viewerId }, select: { id: true } },
    } as const;
  }

  private shape(p: any) {
    const { likes, saves, ...rest } = p;
    return { ...rest, likedByMe: likes.length > 0, savedByMe: saves.length > 0 };
  }
}
