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
import { ContractorsService } from './contractors.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('contractors')
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Get()
  findAll(
    @Query('category') categorySlug?: string,
    @Query('city') citySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contractorsService.findAll({
      categorySlug,
      citySlug,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.contractorsService.findById(id);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONTRACTOR)
  updateMyProfile(
    @CurrentUser() user: { id: string; phone: string; role: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.contractorsService.updateMyProfile(user.id, dto);
  }
}
