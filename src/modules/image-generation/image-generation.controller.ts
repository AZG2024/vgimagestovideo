import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ImageGenerationService } from './image-generation.service';

@Controller('jobs')
export class ImageGenerationController {
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

  @Post(':id/generate-images')
  async generateImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.imageGenerationService.generateImages(id);
  }
}
