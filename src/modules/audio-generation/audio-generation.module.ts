import { Module } from '@nestjs/common';
import { AudioGenerationController } from './audio-generation.controller';
import { AudioGenerationService } from './audio-generation.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [AudioGenerationController],
  providers: [AudioGenerationService],
  exports: [AudioGenerationService],
})
export class AudioGenerationModule {}
