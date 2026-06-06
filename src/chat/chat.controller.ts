import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  @UseGuards(JwtAuthGuard)
  getRooms(@CurrentUser() user: { id: string; phone: string; role: string }) {
    return this.chatService.getRoomsForUser(user.id, user.role);
  }

  @Get('rooms/:id/messages')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; phone: string; role: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(id, user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }
}
