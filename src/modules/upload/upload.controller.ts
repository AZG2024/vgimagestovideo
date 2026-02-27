import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadDto } from './dto/upload.dto';
import { FileValidationPipe } from './pipes/file-validation.pipe';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', { storage: undefined }))
  async upload(
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Body() dto: UploadDto,
  ) {
    return this.uploadService.upload(file, dto);
  }
}
