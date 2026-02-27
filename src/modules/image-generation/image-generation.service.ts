import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../../common/gemini/gemini.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
import {
  NECKLACE_PREMIUM_PROMPT,
  NECKLACE_MODEL_PROMPT,
} from './prompts/necklace.prompts';

interface CategoryPrompts {
  premium: string;
  model: string;
}

const PROMPTS_BY_CATEGORY: Record<string, CategoryPrompts> = {
  necklace: {
    premium: NECKLACE_PREMIUM_PROMPT,
    model: NECKLACE_MODEL_PROMPT,
  },
  // bracelet and home_stones will be added later
};

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly supabaseService: SupabaseService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async generateImages(jobId: string): Promise<{
    premiumImageUrl: string;
    modelImageUrl: string;
  }> {
    const startTime = Date.now();
    const job = await this.jobsService.findById(jobId);

    // Validate
    if (!job.original_image_url) {
      throw new Error(`Job ${jobId} has no original image`);
    }

    const prompts = PROMPTS_BY_CATEGORY[job.product_category];
    if (!prompts) {
      throw new Error(
        `No prompts configured for category: ${job.product_category}`,
      );
    }

    await this.jobsService.updateStatus(jobId, 'PROCESSING_IMAGES');

    try {
      // Download original image from Supabase Storage
      const originalImage = await this.downloadImage(job.original_image_url);

      // Generate premium background image
      this.logger.log(`Job ${jobId}: Generating premium image...`);
      const premiumBuffer = await this.geminiService.generateImageFromImage(
        originalImage.buffer,
        originalImage.mimeType,
        prompts.premium,
        '9:16',
      );

      // Generate model image
      this.logger.log(`Job ${jobId}: Generating model image...`);
      const modelBuffer = await this.geminiService.generateImageFromImage(
        originalImage.buffer,
        originalImage.mimeType,
        prompts.model,
        '9:16',
      );

      // Upload both images to storage
      const bucket = this.configService.get<string>('STORAGE_BUCKET')!;

      const premiumImageUrl = await this.uploadImage(
        bucket,
        `${jobId}/premium.png`,
        premiumBuffer,
      );

      const modelImageUrl = await this.uploadImage(
        bucket,
        `${jobId}/model.png`,
        modelBuffer,
      );

      // Update job with URLs
      await this.jobsService.updateStatus(jobId, 'PENDING', {
        premium_image_url: premiumImageUrl,
        model_image_url: modelImageUrl,
      } as any);

      const durationMs = Date.now() - startTime;
      await this.jobsService.updateStepTiming(
        jobId,
        'image_generation',
        durationMs,
      );

      this.logger.log(
        `Job ${jobId}: Image generation complete in ${durationMs}ms`,
      );

      return { premiumImageUrl, modelImageUrl };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      await this.jobsService.updateStatus(jobId, 'FAILED', {
        error_message: `Image generation failed: ${message}`,
      } as any);
      throw error;
    }
  }

  private async downloadImage(
    imageUrl: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/png';

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  }

  private async uploadImage(
    bucket: string,
    path: string,
    buffer: Buffer,
  ): Promise<string> {
    const { error } = await this.supabaseService
      .getClient()
      .storage.from(bucket)
      .upload(path, buffer, {
        contentType: 'image/png',
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
}
