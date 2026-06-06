import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: { id: string; phone: string; role: string }) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: { id: string; phone: string; role: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.id, dto);
  }

  @Post('me/complete-onboarding')
  @UseGuards(JwtAuthGuard)
  completeOnboarding(
    @CurrentUser() user: { id: string; phone: string; role: string },
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.usersService.completeOnboarding(user.id, dto);
  }
}
