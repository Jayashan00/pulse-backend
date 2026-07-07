import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/message.dto';

const userSelect = { id: true, username: true, displayName: true, avatarUrl: true };

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  /** Lists conversations with the other participant + last message preview. */
  async conversations(userId: string) {
    const convos = await this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: { select: userSelect },
        userB: { select: userSelect },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { read: false, NOT: { senderId: userId } } } } },
      },
    });
    return convos.map((c) => ({
      id: c.id,
      updatedAt: c.updatedAt,
      otherUser: c.userAId === userId ? c.userB : c.userA,
      lastMessage: c.messages[0] || null,
      unreadCount: c._count.messages,
    }));
  }

  async getMessages(conversationId: string, userId: string) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }] },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    // mark incoming as read
    await this.prisma.message.updateMany({
      where: { conversationId, read: false, NOT: { senderId: userId } },
      data: { read: true },
    });
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: userSelect } },
    });
  }

  /** Sends a message, creating the conversation on first contact. */
  async send(userId: string, dto: SendMessageDto) {
    if (dto.recipientId === userId) throw new BadRequestException("You can't message yourself");
    const recipient = await this.prisma.user.findUnique({ where: { id: dto.recipientId } });
    if (!recipient) throw new NotFoundException('Recipient not found');

    const [a, b] = [userId, dto.recipientId].sort();
    const convo = await this.prisma.conversation.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      create: { userAId: a, userBId: b },
      update: { updatedAt: new Date() },
    });

    return this.prisma.message.create({
      data: { conversationId: convo.id, senderId: userId, text: dto.text },
      include: { sender: { select: userSelect } },
    });
  }
}
