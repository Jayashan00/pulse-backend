import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, CreatePostDto, UpdatePostDto } from './dto/post.dto';

const authorSelect = { id: true, username: true, displayName: true, avatarUrl: true };

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private include(viewerId: string) {
    return {
      author: { select: authorSelect },
      _count: { select: { likes: true, comments: true, saves: true } },
      likes: { where: { userId: viewerId }, select: { id: true } },
      saves: { where: { userId: viewerId }, select: { id: true } },
    } as const;
  }

  private shape(p: any) {
    const { likes, saves, ...rest } = p;
    return { ...rest, likedByMe: likes.length > 0, savedByMe: saves.length > 0 };
  }

  /** Cursor-paginated feed, newest first. */
  async feed(viewerId: string, cursor?: string, limit = 10) {
    const take = Math.min(Number(limit) || 10, 30);
    const posts = await this.prisma.post.findMany({
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: this.include(viewerId),
    });
    const hasMore = posts.length > take;
    const items = (hasMore ? posts.slice(0, take) : posts).map((p) => this.shape(p));
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async getOne(id: string, viewerId: string) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: this.include(viewerId) });
    if (!post) throw new NotFoundException('Post not found');
    return this.shape(post);
  }

  async create(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: { authorId: userId, ...dto },
      include: this.include(userId),
    });
    return this.shape(post);
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    await this.assertOwner(id, userId);
    const post = await this.prisma.post.update({ where: { id }, data: dto, include: this.include(userId) });
    return this.shape(post);
  }

  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId);
    await this.prisma.post.delete({ where: { id } });
    return { success: true };
  }

  /** Toggle like; creates a notification for the post author. */
  async toggleLike(postId: string, user: any) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });
    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await this.prisma.like.create({ data: { postId, userId: user.id } });
    if (post.authorId !== user.id) {
      await this.prisma.notification.create({
        data: {
          userId: post.authorId,
          actorId: user.id,
          postId,
          type: 'like',
          message: `@${user.username} liked your post`,
        },
      });
    }
    return { liked: true };
  }

  async toggleSave(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await this.prisma.save.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.save.delete({ where: { id: existing.id } });
      return { saved: false };
    }
    await this.prisma.save.create({ data: { postId, userId } });
    return { saved: true };
  }

  /** Called when a user shares a post (copy link) — tracks the share count. */
  async share(postId: string) {
    const post = await this.prisma.post.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });
    return { shareCount: post.shareCount };
  }

  async getComments(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: authorSelect } },
    });
  }

  async addComment(postId: string, user: any, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const comment = await this.prisma.comment.create({
      data: { postId, userId: user.id, text: dto.text },
      include: { user: { select: authorSelect } },
    });
    if (post.authorId !== user.id) {
      await this.prisma.notification.create({
        data: {
          userId: post.authorId,
          actorId: user.id,
          postId,
          type: 'comment',
          message: `@${user.username} commented: "${dto.text.slice(0, 60)}"`,
        },
      });
    }
    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('You can only delete your own comments');
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  private async assertOwner(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You can only modify your own posts');
  }
}
