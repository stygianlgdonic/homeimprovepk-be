import { IsNumber, IsString, IsPositive, IsInt, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  description: string;

  @IsInt()
  @Min(1)
  estimatedDays: number;
}
