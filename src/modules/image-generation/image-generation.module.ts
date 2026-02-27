import { Module } from '@nestjs/common';
import { ImageGenerationService } from './image-generation.service';
import { ImageGenerationController } from './image-generation.controller';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [ImageGenerationController],
  providers: [ImageGenerationService],
  exports: [ImageGenerationService],
})
export class ImageGenerationModule {}
