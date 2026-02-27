import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenaiService } from '../../common/openai/openai.service';
import { ElevenLabsService } from '../../common/elevenlabs/elevenlabs.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class AudioGenerationService {
  private readonly logger = new Logger(AudioGenerationService.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly elevenLabsService: ElevenLabsService,
    private readonly supabaseService: SupabaseService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async generateAudio(jobId: string): Promise<void> {
    const startTime = Date.now();
    const job = await this.jobsService.findById(jobId);

    if (!job.product_category) {
      throw new Error(`Job ${jobId} is missing product_category.`);
    }

    const stoneName = job.stone_name || 'natural gemstone';

    await this.jobsService.updateStatus(jobId, 'PROCESSING_AUDIO');

    try {
      // Step 1: Generate description with OpenAI
      this.logger.log(`Job ${jobId}: Generating product description...`);
      const description = await this.openaiService.generateProductDescription(
        job.product_category,
        stoneName,
      );

      // Save description to job
      await this.jobsService.updateStatus(jobId, 'PROCESSING_AUDIO', {
        description_text: description,
      } as any);

      this.logger.log(`Job ${jobId}: Description: "${description}"`);

      // Step 2: Convert to audio with ElevenLabs
      this.logger.log(`Job ${jobId}: Generating TTS audio...`);
      const audioBuffer = await this.elevenLabsService.textToSpeech(description);

      // Step 3: Upload audio to Supabase
      this.logger.log(`Job ${jobId}: Uploading audio...`);
      const bucket = this.configService.get<string>('STORAGE_BUCKET')!;

      const { error } = await this.supabaseService
        .getClient()
        .storage.from(bucket)
        .upload(`${jobId}/audio.mp3`, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload audio: ${error.message}`);
      }

      const { data } = this.supabaseService
        .getClient()
        .storage.from(bucket)
        .getPublicUrl(`${jobId}/audio.mp3`);

      // Update job with audio URL
      await this.jobsService.updateStatus(jobId, 'PENDING', {
        audio_url: data.publicUrl,
      } as any);

      const durationMs = Date.now() - startTime;
      await this.jobsService.updateStepTiming(jobId, 'audio_generation', durationMs);

      this.logger.log(
        `Job ${jobId}: Audio generation complete in ${durationMs}ms. URL: ${data.publicUrl}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Job ${jobId}: Audio generation failed: ${message}`);
      try {
        await this.jobsService.updateStatus(jobId, 'FAILED', {
          error_message: `Audio generation failed: ${message}`,
        } as any);
      } catch (updateError) {
        this.logger.error(
          `Could not update job ${jobId} to FAILED: ${updateError}`,
        );
      }
    }
  }
}
