import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../../common/gemini/gemini.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';

const VIDEO_PROMPT_PREMIUM = 'Smooth cinematic camera movement, slow zoom in with gentle panning, professional product showcase, elegant lighting transitions, luxury commercial feel';
const VIDEO_PROMPT_MODEL = 'A female model wearing the necklace around her neck, smooth cinematic camera movement, gentle panning around the model, professional fashion showcase, elegant studio lighting, luxury e-commerce feel';

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly supabaseService: SupabaseService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async generateVideos(jobId: string): Promise<void> {
    const startTime = Date.now();
    const job = await this.jobsService.findById(jobId);

    if (!job.premium_image_url || !job.model_image_url) {
      throw new Error(`Job ${jobId} is missing generated images. Run image generation first.`);
    }

    await this.jobsService.updateStatus(jobId, 'PROCESSING_VIDEOS');

    try {
      const bucket = this.configService.get<string>('STORAGE_BUCKET')!;

      // Generate both videos in parallel with Veo 3.1
      this.logger.log(`Job ${jobId}: Premium image URL: ${job.premium_image_url}`);
      this.logger.log(`Job ${jobId}: Model image URL: ${job.model_image_url}`);
      this.logger.log(`Job ${jobId}: Generating 2 videos in parallel via Veo 3.1...`);
      const [video1Buffer, video2Buffer] = await this.geminiService.generateVideosFromImagesParallel([
        { imageUrl: job.premium_image_url, prompt: VIDEO_PROMPT_PREMIUM, durationSeconds: 6 },
        { imageUrl: job.model_image_url, prompt: VIDEO_PROMPT_MODEL, durationSeconds: 8 },
      ]);

      // Upload both video buffers in parallel
      this.logger.log(`Job ${jobId}: Both videos ready, uploading to storage...`);
      const [video1Url, video2Url] = await Promise.all([
        this.retryOperation(
          () => this.uploadBuffer(video1Buffer, bucket, `${jobId}/video1.mp4`),
          'upload video 1',
        ),
        this.retryOperation(
          () => this.uploadBuffer(video2Buffer, bucket, `${jobId}/video2.mp4`),
          'upload video 2',
        ),
      ]);

      // Update job with retry
      await this.retryOperation(
        () => this.jobsService.updateStatus(jobId, 'PENDING', {
          video1_url: video1Url,
          video2_url: video2Url,
        } as any),
        'update job status',
      );

      const durationMs = Date.now() - startTime;
      await this.retryOperation(
        () => this.jobsService.updateStepTiming(jobId, 'video_generation', durationMs),
        'update step timing',
      );

      this.logger.log(`Job ${jobId}: Video generation complete in ${durationMs}ms`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Job ${jobId}: Video generation failed: ${message}`);
      try {
        await this.retryOperation(
          () => this.jobsService.updateStatus(jobId, 'FAILED', {
            error_message: `Video generation failed: ${message}`,
          } as any),
          'update job to FAILED',
        );
      } catch (updateError) {
        this.logger.error(`Could not update job ${jobId} to FAILED: ${updateError}`);
      }
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    label: string,
    maxRetries: number = 3,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Attempt ${attempt}/${maxRetries} failed for "${label}": ${msg}`);
        if (attempt === maxRetries) {
          throw error;
        }
        const delayMs = attempt * 2000;
        this.logger.log(`Retrying "${label}" in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(`Unreachable`);
  }

  private async uploadBuffer(
    buffer: Buffer,
    bucket: string,
    path: string,
  ): Promise<string> {
    this.logger.log(`Uploading ${path} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);

    const { error } = await this.supabaseService
      .getClient()
      .storage.from(bucket)
      .upload(path, buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload ${path}: ${error.message}`);
    }

    const { data } = this.supabaseService
      .getClient()
      .storage.from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Kept for future use with WaveSpeed/Kling
  private async downloadAndUpload(
    sourceUrl: string,
    bucket: string,
    path: string,
  ): Promise<string> {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return this.uploadBuffer(buffer, bucket, path);
  }
}
