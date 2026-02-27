import { Controller, Logger, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { VideoGenerationService } from './video-generation.service';

@Controller('jobs')
export class VideoGenerationController {
  private readonly logger = new Logger(VideoGenerationController.name);

  constructor(
    private readonly videoGenerationService: VideoGenerationService,
  ) {}

  @Post(':id/generate-videos')
  async generateVideos(@Param('id', ParseUUIDPipe) id: string) {
    // Fire and forget - launch in background, return immediately
    this.videoGenerationService.generateVideos(id).catch((err) => {
      this.logger.error(`Background video generation failed for ${id}: ${err.message}`);
    });

    return { status: 'processing', jobId: id };
  }
}
