import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: { id: string; phone: string; role: UserRole }) {
    return this.bookingsService.findForUser(user.id, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; phone: string; role: UserRole },
  ) {
    return this.bookingsService.findById(id, user.id);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  complete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; phone: string; role: UserRole },
  ) {
    return this.bookingsService.complete(id, user.id);
  }
}
