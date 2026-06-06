import { IsString, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CompleteOnboardingDto {
  @IsString()
  name: string;

  @IsEnum(UserRole)
  role: UserRole;
}
