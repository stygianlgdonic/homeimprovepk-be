import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.homeownerId !== authorId && booking.thekedaarId !== authorId) {
      throw new ForbiddenException('You are not part of this booking');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed bookings');
    }

    const existing = await this.prisma.review.findUnique({
      where: { bookingId_authorId: { bookingId: dto.bookingId, authorId } },
    });

    if (existing) {
      throw new BadRequestException('You have already reviewed this booking');
    }

    // Determine subject: if author is homeowner, subject is thekedaar; if thekedaar, subject is homeowner
    const subjectId =
      authorId === booking.homeownerId ? booking.thekedaarId : booking.homeownerId;

    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        authorId,
        subjectId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        subject: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Recalculate thekedaar avgRating if the subject is a thekedaar
    const thekedaarProfile = await this.prisma.thekedaarProfile.findUnique({
      where: { userId: subjectId },
    });

    if (thekedaarProfile) {
      const stats = await this.prisma.review.aggregate({
        where: { subjectId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await this.prisma.thekedaarProfile.update({
        where: { userId: subjectId },
        data: {
          avgRating: stats._avg.rating ?? 0,
          totalReviews: stats._count.rating,
        },
      });
    }

    return review;
  }

  async findByThekedaar(userId: string) {
    return this.prisma.review.findMany({
      where: { subjectId: userId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
