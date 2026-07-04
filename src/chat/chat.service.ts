import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomsForUser(userId: string, role: string) {
    const where: any =
      role === 'HOMEOWNER'
        ? { homeownerId: userId }
        : role === 'CONTRACTOR'
        ? { contractorId: userId }
        : {};

    return this.prisma.chatRoom.findMany({
      where,
      include: {
        jobPost: {
          select: { id: true, title: true, status: true },
        },
        homeowner: {
          select: { id: true, name: true, avatarUrl: true },
        },
        contractor: {
          select: { id: true, name: true, avatarUrl: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRoomById(id: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id },
      include: {
        jobPost: {
          select: { id: true, title: true, status: true },
        },
        homeowner: {
          select: { id: true, name: true, avatarUrl: true },
        },
        contractor: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    if (room.homeownerId !== userId && room.contractorId !== userId) {
      throw new ForbiddenException('You do not have access to this chat room');
    }

    return room;
  }

  async getMessages(
    roomId: string,
    userId: string,
    { page = 1, limit = 30 }: { page?: number; limit?: number },
  ) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    if (room.homeownerId !== userId && room.contractorId !== userId) {
      throw new ForbiddenException('You do not have access to this chat room');
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { chatRoomId: roomId },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where: { chatRoomId: roomId } }),
    ]);

    return { data: data.reverse(), total, page, limit };
  }

  async saveMessage(roomId: string, senderId: string, content: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    if (room.homeownerId !== senderId && room.contractorId !== senderId) {
      throw new ForbiddenException('You do not have access to this chat room');
    }

    return this.prisma.message.create({
      data: {
        chatRoomId: roomId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  async markMessagesRead(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });

    if (!room) return;

    if (room.homeownerId !== userId && room.contractorId !== userId) return;

    await this.prisma.message.updateMany({
      where: {
        chatRoomId: roomId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }
}
