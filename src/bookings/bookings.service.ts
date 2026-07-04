import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string, role: UserRole) {
    const where: any =
      role === UserRole.HOMEOWNER
        ? { homeownerId: userId }
        : role === UserRole.CONTRACTOR
        ? { contractorId: userId }
        : {};

    return this.prisma.booking.findMany({
      where,
      include: {
        jobPost: {
          include: {
            category: true,
            city: true,
          },
        },
        quote: true,
        homeowner: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        contractor: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        reviews: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        jobPost: {
          include: {
            category: true,
            city: true,
          },
        },
        quote: true,
        homeowner: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        contractor: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        reviews: true,
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.homeownerId !== userId && booking.contractorId !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  async complete(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.homeownerId !== userId && booking.contractorId !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Update contractor totalJobs count
    await this.prisma.contractorProfile.updateMany({
      where: { userId: booking.contractorId },
      data: { totalJobs: { increment: 1 } },
    });

    // Update job status to COMPLETED
    await this.prisma.jobPost.update({
      where: { id: booking.jobPostId },
      data: { status: 'COMPLETED' },
    });

    return updated;
  }
}
