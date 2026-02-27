import { Controller, Logger, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { VideoRenderingService } from './video-rendering.service';

@Controller('jobs')
export class VideoRenderingController {
  private readonly logger = new Logger(VideoRenderingController.name);

  constructor(
    private readonly videoRenderingService: VideoRenderingService,
  ) {}

  @Post(':id/render')
  async renderVideo(@Param('id', ParseUUIDPipe) id: string) {
    // Fire and forget
    this.videoRenderingService.renderVideo(id).catch((err) => {
      this.logger.error(`Background rendering failed for ${id}: ${err.message}`);
    });

    return { status: 'rendering', jobId: id };
  }
}
