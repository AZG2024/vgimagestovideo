import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductCategory } from '../../jobs/dto/create-job.dto';

export class UploadDto {
  @IsEnum(ProductCategory)
  productCategory: ProductCategory;

  @IsOptional()
  @IsString()
  stoneName?: string;
}
