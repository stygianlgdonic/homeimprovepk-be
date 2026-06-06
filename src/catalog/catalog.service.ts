import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  findAllCategories() {
    return this.prisma.serviceCategory.findMany({
      orderBy: { nameEn: 'asc' },
    });
  }

  findAllCities() {
    return this.prisma.city.findMany({
      orderBy: { nameEn: 'asc' },
    });
  }
}
