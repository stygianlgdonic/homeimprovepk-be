import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateJobDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  categorySlug: string;

  @IsString()
  citySlug: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;
}
