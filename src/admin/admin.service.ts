import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalThekedaars,
      approvedThekedaars,
      totalJobs,
      completedJobs,
      revenueResult,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.thekedaarProfile.count(),
      this.prisma.thekedaarProfile.count({
        where: { verificationStatus: VerificationStatus.APPROVED },
      }),
      this.prisma.jobPost.count(),
      this.prisma.jobPost.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { platformFee: true },
      }),
    ]);

    const totalRevenue = revenueResult._sum.platformFee ?? 0;

    return {
      totalUsers,
      totalThekedaars,
      approvedThekedaars,
      totalJobs,
      completedJobs,
      totalRevenue,
    };
  }

  async getPendingThekedaars(status?: string) {
    const verificationStatus = status
      ? (status as VerificationStatus)
      : VerificationStatus.PENDING;

    return this.prisma.thekedaarProfile.findMany({
      where: { verificationStatus },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        serviceCategories: true,
        cities: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async verifyThekedaar(profileId: string, status: 'APPROVED' | 'REJECTED') {
    const profile = await this.prisma.thekedaarProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Thekedaar profile not found');
    }

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new BadRequestException('Status must be APPROVED or REJECTED');
    }

    return this.prisma.thekedaarProfile.update({
      where: { id: profileId },
      data: { verificationStatus: status as VerificationStatus },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
      },
    });
  }

  async getDisputes() {
    return this.prisma.booking.findMany({
      where: { status: 'DISPUTED' },
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
        thekedaar: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
