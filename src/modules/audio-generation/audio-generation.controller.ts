import { Controller, Logger, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AudioGenerationService } from './audio-generation.service';

@Controller('jobs')
export class AudioGenerationController {
  private readonly logger = new Logger(AudioGenerationController.name);

  constructor(
    private readonly audioGenerationService: AudioGenerationService,
  ) {}

  @Post(':id/generate-audio')
  async generateAudio(@Param('id', ParseUUIDPipe) id: string) {
    // Fire and forget
    this.audioGenerationService.generateAudio(id).catch((err) => {
      this.logger.error(
        `Background audio generation failed for ${id}: ${err.message}`,
      );
    });

    return { status: 'processing_audio', jobId: id };
  }
}
