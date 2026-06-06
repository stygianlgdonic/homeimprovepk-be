import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        thekedaarProfile: {
          include: {
            serviceCategories: true,
            cities: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.preferredLang !== undefined && { preferredLang: dto.preferredLang }),
      },
      include: {
        thekedaarProfile: {
          include: {
            serviceCategories: true,
            cities: true,
          },
        },
      },
    });

    if (updated.role === UserRole.THEKEDAAR) {
      await this.prisma.thekedaarProfile.upsert({
        where: { userId: id },
        update: {},
        create: {
          userId: id,
          verificationStatus: 'PENDING',
        },
      });
    }

    return updated;
  }

  async completeOnboarding(id: string, dto: CompleteOnboardingDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
      },
    });

    if (dto.role === UserRole.THEKEDAAR) {
      await this.prisma.thekedaarProfile.upsert({
        where: { userId: id },
        update: {},
        create: {
          userId: id,
          verificationStatus: 'PENDING',
        },
      });
    }

    return this.findById(id);
  }
}
