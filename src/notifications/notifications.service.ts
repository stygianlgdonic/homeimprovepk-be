import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async create(userId: string, type: string, payload: Record<string, any>) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        payload,
      },
    });
  }

  async findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        readAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async enqueue(userId: string, type: string, payload: Record<string, any>) {
    const notification = await this.create(userId, type, payload);

    await this.notificationsQueue.add('send-notification', {
      notificationId: notification.id,
      userId,
      type,
      payload,
    });

    return notification;
  }
}
