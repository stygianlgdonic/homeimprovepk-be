import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface FindAllFilters {
  categorySlug?: string;
  citySlug?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ContractorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ categorySlug, citySlug, page = 1, limit = 10 }: FindAllFilters) {
    const skip = (page - 1) * limit;

    const where: any = {
      verificationStatus: 'APPROVED',
    };

    if (categorySlug) {
      where.serviceCategories = {
        some: { slug: categorySlug },
      };
    }

    if (citySlug) {
      where.cities = {
        some: { slug: citySlug },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.contractorProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              phone: true,
            },
          },
          serviceCategories: true,
          cities: true,
        },
        orderBy: { avgRating: 'desc' },
      }),
      this.prisma.contractorProfile.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const profile = await this.prisma.contractorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        },
        serviceCategories: true,
        cities: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Contractor profile not found');
    }

    return profile;
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.contractorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Contractor profile not found');
    }

    const updateData: any = {};

    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.cnicNumber !== undefined) updateData.cnicNumber = dto.cnicNumber;
    if (dto.pricingRangeMin !== undefined) updateData.pricingRangeMin = dto.pricingRangeMin;
    if (dto.pricingRangeMax !== undefined) updateData.pricingRangeMax = dto.pricingRangeMax;

    if (dto.serviceCategorySlugs !== undefined) {
      const categories = await this.prisma.serviceCategory.findMany({
        where: { slug: { in: dto.serviceCategorySlugs } },
        select: { id: true },
      });
      updateData.serviceCategories = {
        set: categories.map((c) => ({ id: c.id })),
      };
    }

    if (dto.citySlugs !== undefined) {
      const cities = await this.prisma.city.findMany({
        where: { slug: { in: dto.citySlugs } },
        select: { id: true },
      });
      updateData.cities = {
        set: cities.map((c) => ({ id: c.id })),
      };
    }

    return this.prisma.contractorProfile.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            phone: true,
          },
        },
        serviceCategories: true,
        cities: true,
      },
    });
  }
}
