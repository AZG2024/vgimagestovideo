import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ProductCategory {
  BRACELET = 'bracelet',
  NECKLACE = 'necklace',
  HOME_STONES = 'home_stones',
}

export class CreateJobDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(ProductCategory)
  productCategory: ProductCategory;

  @IsOptional()
  @IsString()
  stoneName?: string;
}
