import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Controller()
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('jobs/:jobId/quotes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONTRACTOR)
  create(
    @Param('jobId') jobId: string,
    @CurrentUser() user: { id: string; phone: string; role: UserRole },
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quotesService.create(jobId, user.id, dto);
  }

  @Get('jobs/:jobId/quotes')
  @UseGuards(JwtAuthGuard)
  findForJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: { id: string; phone: string; role: UserRole },
  ) {
    return this.quotesService.findForJob(jobId, user.id, user.role);
  }

  @Patch('quotes/:id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOMEOWNER)
  accept(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; phone: string; role: UserRole },
  ) {
    return this.quotesService.accept(id, user.id);
  }
}
