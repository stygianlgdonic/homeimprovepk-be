import { IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/, { message: 'Phone must be a valid Pakistani number (+92XXXXXXXXXX)' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  code: string;
}
