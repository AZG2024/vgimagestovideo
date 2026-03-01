import { Controller, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ImageGenerationService } from './image-generation.service';

@Controller('jobs')
export class ImageGenerationController {
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

  @Post(':id/generate-images')
  async generateImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('ratio') ratio?: string,
  ) {
    const aspectRatio = ratio === '1:1' ? '1:1' : '9:16';
    return this.imageGenerationService.generateImages(id, aspectRatio);
  }
}
