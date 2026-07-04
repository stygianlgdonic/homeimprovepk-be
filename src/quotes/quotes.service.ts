import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JobStatus, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

const contractorSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  contractorProfile: {
    select: { avgRating: true, verificationStatus: true },
  },
} as const;

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(jobPostId: string, contractorUserId: string, dto: CreateQuoteDto) {
    const job = await this.prisma.jobPost.findUnique({ where: { id: jobPostId } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.OPEN && job.status !== JobStatus.QUOTED) {
      throw new BadRequestException('Job is not accepting quotes');
    }

    const existing = await this.prisma.quote.findUnique({
      where: { jobPostId_contractorId: { jobPostId, contractorId: contractorUserId } },
    });

    if (existing) {
      throw new BadRequestException('You have already submitted a quote for this job');
    }

    const contractorProfile = await this.prisma.contractorProfile.findUnique({
      where: { userId: contractorUserId },
    });

    if (!contractorProfile) {
      throw new NotFoundException('Contractor profile not found — complete your profile first');
    }

    const quote = await this.prisma.quote.create({
      data: {
        jobPostId,
        contractorId: contractorUserId,
        amount: dto.amount,
        description: dto.description,
        estimatedDays: dto.estimatedDays,
        status: QuoteStatus.PENDING,
      },
      include: { contractor: { select: contractorSelect } },
    });

    if (job.status === JobStatus.OPEN) {
      await this.prisma.jobPost.update({
        where: { id: jobPostId },
        data: { status: JobStatus.QUOTED },
      });
    }

    return quote;
  }

  async findForJob(jobPostId: string, requesterId: string, requesterRole: string) {
    const job = await this.prisma.jobPost.findUnique({ where: { id: jobPostId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const where: Record<string, unknown> = { jobPostId };

    if (requesterRole === 'CONTRACTOR') {
      where.contractorId = requesterId;
    }

    return this.prisma.quote.findMany({
      where,
      include: { contractor: { select: contractorSelect } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async accept(quoteId: string, homeownerId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { jobPost: true },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.jobPost.homeownerId !== homeownerId) {
      throw new ForbiddenException('You do not own this job');
    }

    if (quote.status !== QuoteStatus.PENDING) {
      throw new BadRequestException('Quote is no longer pending');
    }

    await this.prisma.quote.updateMany({
      where: { jobPostId: quote.jobPostId, id: { not: quoteId } },
      data: { status: QuoteStatus.REJECTED },
    });

    const acceptedQuote = await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.ACCEPTED },
      include: { contractor: { select: contractorSelect } },
    });

    const booking = await this.prisma.booking.create({
      data: {
        jobPostId: quote.jobPostId,
        quoteId,
        homeownerId,
        contractorId: acceptedQuote.contractor.id,
        status: 'SCHEDULED',
      },
    });

    await this.prisma.chatRoom.upsert({
      where: { jobPostId: quote.jobPostId },
      update: {},
      create: {
        jobPostId: quote.jobPostId,
        homeownerId,
        contractorId: acceptedQuote.contractor.id,
      },
    });

    await this.prisma.jobPost.update({
      where: { id: quote.jobPostId },
      data: { status: JobStatus.IN_PROGRESS },
    });

    return { quote: acceptedQuote, booking };
  }
}
