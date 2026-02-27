import { Module } from '@nestjs/common';
import { VideoRenderingService } from './video-rendering.service';
import { VideoRenderingController } from './video-rendering.controller';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [VideoRenderingController],
  providers: [VideoRenderingService],
  exports: [VideoRenderingService],
})
export class VideoRenderingModule {}
