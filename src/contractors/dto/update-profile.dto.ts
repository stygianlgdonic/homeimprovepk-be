import { IsOptional, IsString, IsNumber, IsArray, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  cnicNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricingRangeMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricingRangeMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCategorySlugs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  citySlugs?: string[];
}
