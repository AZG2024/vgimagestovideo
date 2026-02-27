import { Module } from '@nestjs/common';
import { VideoGenerationService } from './video-generation.service';
import { VideoGenerationController } from './video-generation.controller';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [VideoGenerationController],
  providers: [VideoGenerationService],
  exports: [VideoGenerationService],
})
export class VideoGenerationModule {}
