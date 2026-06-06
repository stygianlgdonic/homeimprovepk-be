import {
  Controller,
  Get,
  Post,
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
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOMEOWNER)
  create(
    @CurrentUser() user: { id: string; phone: string; role: UserRole },
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @CurrentUser() user: { id: string; phone: string; role: UserRole },
    @Query('status') status?: string,
    @Query('city') citySlug?: string,
    @Query('category') categorySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.getJobsForCurrentUser(user.id, user.role, {
      status: status as any,
      citySlug,
      categorySlug,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.jobsService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; phone: string; role: UserRole },
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.jobsService.updateStatus(id, user.id, user.role, dto);
  }
}
