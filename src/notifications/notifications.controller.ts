import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: { id: string; phone: string; role: string }) {
    return this.notificationsService.findForUser(user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; phone: string; role: string },
  ) {
    return this.notificationsService.markRead(id, user.id);
  }
}
