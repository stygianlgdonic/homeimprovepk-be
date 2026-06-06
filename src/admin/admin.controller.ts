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
import { AdminService } from './admin.service';

class VerifyThekedaarDto {
  status: 'APPROVED' | 'REJECTED';
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('thekedaars')
  getPendingThekedaars(@Query('status') status?: string) {
    return this.adminService.getPendingThekedaars(status);
  }

  @Patch('thekedaars/:id/verify')
  verifyThekedaar(
    @Param('id') id: string,
    @Body() body: VerifyThekedaarDto,
  ) {
    return this.adminService.verifyThekedaar(id, body.status);
  }

  @Get('disputes')
  getDisputes() {
    return this.adminService.getDisputes();
  }
}
