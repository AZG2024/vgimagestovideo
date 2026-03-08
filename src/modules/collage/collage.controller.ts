import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CollageService } from './collage.service';

@Controller('collage')
export class CollageController {
  constructor(private readonly collageService: CollageService) {}

  @Post('generate')
  @UseInterceptors(FilesInterceptor('images', 6, { storage: undefined }))
  async generate(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('categoryName') categoryName: string,
  ) {
    if (!files || files.length < 4 || files.length > 6) {
      throw new BadRequestException('Please upload between 4 and 6 images');
    }

    if (!categoryName || !categoryName.trim()) {
      throw new BadRequestException('Category name is required');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.originalname}. Only PNG, JPG, and WEBP are allowed`,
        );
      }
    }

    const collageUrl = await this.collageService.generateCollage(
      files,
      categoryName.trim(),
    );

    return { collageUrl };
  }

  @Post('promotion')
  @UseInterceptors(FileInterceptor('image', { storage: undefined }))
  async promotion(
    @UploadedFile() file: Express.Multer.File,
    @Body('discount') discount: string,
  ) {
    if (!file) {
      throw new BadRequestException('Please upload a product image');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.originalname}. Only PNG, JPG, and WEBP are allowed`,
      );
    }

    const discountNum = parseInt(discount, 10);
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 99) {
      throw new BadRequestException('Discount must be a number between 1 and 99');
    }

    const promotionUrl = await this.collageService.generatePromotion(
      file,
      discountNum,
    );

    return { promotionUrl };
  }
}
