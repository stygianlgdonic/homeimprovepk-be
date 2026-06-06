import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ThekedaarsService } from './thekedaars.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('thekedaars')
export class ThekedaarsController {
  constructor(private readonly thekedaarsService: ThekedaarsService) {}

  @Get()
  findAll(
    @Query('category') categorySlug?: string,
    @Query('city') citySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.thekedaarsService.findAll({
      categorySlug,
      citySlug,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.thekedaarsService.findById(id);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.THEKEDAAR)
  updateMyProfile(
    @CurrentUser() user: { id: string; phone: string; role: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.thekedaarsService.updateMyProfile(user.id, dto);
  }
}
