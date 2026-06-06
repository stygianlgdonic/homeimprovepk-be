import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { quote: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.homeownerId !== userId) {
      throw new ForbiddenException('You do not own this booking');
    }

    // Check if payment already exists
    const existing = await this.prisma.payment.findUnique({
      where: { bookingId: dto.bookingId },
    });

    const amount = booking.quote.amount;
    const platformFee = Number(amount) * 0.05; // 5% platform fee

    // Stub implementation: mark as completed immediately
    const transactionId = `STUB_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const payment = existing
      ? await this.prisma.payment.update({
          where: { bookingId: dto.bookingId },
          data: {
            method: dto.method,
            status: PaymentStatus.COMPLETED,
            providerRef: transactionId,
          },
        })
      : await this.prisma.payment.create({
          data: {
            bookingId: dto.bookingId,
            amount,
            platformFee,
            method: dto.method,
            status: PaymentStatus.COMPLETED,
            providerRef: transactionId,
          },
        });

    return {
      success: true,
      transactionId,
      payment,
    };
  }
}
