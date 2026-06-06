import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JobStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

interface FindAllFilters {
  status?: JobStatus;
  citySlug?: string;
  categorySlug?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(homeownerId: string, dto: CreateJobDto) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { slug: dto.categorySlug },
    });
    if (!category) {
      throw new NotFoundException(`Category '${dto.categorySlug}' not found`);
    }

    const city = await this.prisma.city.findUnique({
      where: { slug: dto.citySlug },
    });
    if (!city) {
      throw new NotFoundException(`City '${dto.citySlug}' not found`);
    }

    return this.prisma.jobPost.create({
      data: {
        homeownerId,
        title: dto.title,
        description: dto.description,
        categoryId: category.id,
        cityId: city.id,
        area: dto.area,
        photos: dto.photos ?? [],
        budgetMin: dto.budgetMin ?? null,
        budgetMax: dto.budgetMax ?? null,
        status: JobStatus.OPEN,
      },
      include: {
        category: true,
        city: true,
        homeowner: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
      },
    });
  }

  async findAll(userId: string, role: UserRole, filters: FindAllFilters) {
    const { status, citySlug, categorySlug, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role === UserRole.HOMEOWNER) {
      where.homeownerId = userId;
      if (status) where.status = status;
    } else if (role === UserRole.THEKEDAAR) {
      // Thekedaars see OPEN jobs in cities they cover
      where.status = JobStatus.OPEN;

      const thekedaarProfile = await this.prisma.thekedaarProfile.findUnique({
        where: { userId },
        include: { cities: { select: { id: true } } },
      });

      if (thekedaarProfile && thekedaarProfile.cities.length > 0) {
        where.cityId = { in: thekedaarProfile.cities.map((c) => c.id) };
      }
    } else if (role === UserRole.ADMIN) {
      if (status) where.status = status;
    }

    if (citySlug) {
      const city = await this.prisma.city.findUnique({ where: { slug: citySlug } });
      if (city) where.cityId = city.id;
    }

    if (categorySlug) {
      const category = await this.prisma.serviceCategory.findUnique({ where: { slug: categorySlug } });
      if (category) where.categoryId = category.id;
    }

    const [data, total] = await Promise.all([
      this.prisma.jobPost.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          city: true,
          homeowner: {
            select: { id: true, name: true, phone: true, avatarUrl: true },
          },
          _count: { select: { quotes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobPost.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const job = await this.prisma.jobPost.findUnique({
      where: { id },
      include: {
        category: true,
        city: true,
        homeowner: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
        quotes: {
          include: {
            thekedaar: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                thekedaarProfile: { select: { avgRating: true, verificationStatus: true } },
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async updateStatus(
    id: string,
    userId: string,
    role: UserRole,
    dto: UpdateJobStatusDto,
  ) {
    const job = await this.prisma.jobPost.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (role === UserRole.HOMEOWNER && job.homeownerId !== userId) {
      throw new ForbiddenException('You do not own this job');
    }

    if (role === UserRole.THEKEDAAR) {
      // Thekedaars can only cancel jobs they are booked for
      const booking = await this.prisma.booking.findFirst({
        where: { jobPostId: id, thekedaarId: userId },
      });
      if (!booking) {
        throw new ForbiddenException('You are not authorized to update this job status');
      }
      if (dto.status !== JobStatus.CANCELLED) {
        throw new ForbiddenException('Thekedaars may only cancel jobs');
      }
    }

    return this.prisma.jobPost.update({
      where: { id },
      data: { status: dto.status },
      include: {
        category: true,
        city: true,
        homeowner: {
          select: { id: true, name: true, phone: true, avatarUrl: true },
        },
      },
    });
  }

  async getJobsForCurrentUser(userId: string, role: UserRole, filters: FindAllFilters) {
    return this.findAll(userId, role, filters);
  }
}
