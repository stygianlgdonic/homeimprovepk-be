import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/, { message: 'Phone must be a valid Pakistani number (+92XXXXXXXXXX)' })
  phone: string;
}
