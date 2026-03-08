import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppConfigModule } from './config/config.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { HealthModule } from './modules/health/health.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { UploadModule } from './modules/upload/upload.module';
import { GeminiModule } from './common/gemini/gemini.module';
import { ImageGenerationModule } from './modules/image-generation/image-generation.module';
import { WaveSpeedModule } from './common/wavespeed/wavespeed.module';
import { VideoGenerationModule } from './modules/video-generation/video-generation.module';
import { FfmpegModule } from './common/ffmpeg/ffmpeg.module';
import { ShotstackModule } from './common/shotstack/shotstack.module';
import { OpenaiModule } from './common/openai/openai.module';
import { ElevenLabsModule } from './common/elevenlabs/elevenlabs.module';
import { VideoRenderingModule } from './modules/video-rendering/video-rendering.module';
import { AudioGenerationModule } from './modules/audio-generation/audio-generation.module';
import { CollageModule } from './modules/collage/collage.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    AppConfigModule,
    SupabaseModule,
    GeminiModule,
    WaveSpeedModule,
    FfmpegModule,
    ShotstackModule,
    OpenaiModule,
    ElevenLabsModule,
    HealthModule,
    JobsModule,
    UploadModule,
    ImageGenerationModule,
    VideoGenerationModule,
    VideoRenderingModule,
    AudioGenerationModule,
    CollageModule,
  ],
})
export class AppModule {}
