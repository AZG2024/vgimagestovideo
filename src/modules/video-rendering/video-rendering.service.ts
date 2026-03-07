import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShotstackService } from '../../common/shotstack/shotstack.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class VideoRenderingService {
  private readonly logger = new Logger(VideoRenderingService.name);

  constructor(
    private readonly shotstackService: ShotstackService,
    private readonly supabaseService: SupabaseService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async renderVideo(jobId: string): Promise<void> {
    const startTime = Date.now();
    const job = await this.jobsService.findById(jobId);

    if (!job.video1_url || !job.video2_url) {
      throw new Error(`Job ${jobId} is missing videos. Run video generation first.`);
    }

    await this.jobsService.updateStatus(jobId, 'RENDERING');

    try {
      // Get background music URL
      const bgMusicUrl = await this.getRandomMusicUrl();
      if (bgMusicUrl) {
        this.logger.log(`Job ${jobId}: Selected background music: ${bgMusicUrl}`);
      }

      // Render with Shotstack: video1(5s) → video2(10s) → video1(5s) = ~18s with crossfades
      this.logger.log(
        `Job ${jobId}: Starting Shotstack rendering (voice: ${!!job.audio_url}, music: ${!!bgMusicUrl})...`,
      );

      const renderedVideoUrl = await this.shotstackService.renderFinalVideo(
        job.video1_url,
        job.video2_url,
        job.video1_url, // reuse video1 as third clip
        job.audio_url || undefined,
        bgMusicUrl || undefined,
      );

      // Download rendered video from Shotstack and upload to Supabase
      this.logger.log(`Job ${jobId}: Uploading final video to storage...`);
      const bucket = this.configService.get<string>('STORAGE_BUCKET')!;

      const response = await fetch(renderedVideoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download rendered video: ${response.statusText}`);
      }
      const finalBuffer = Buffer.from(await response.arrayBuffer());

      this.logger.log(`Final video size: ${(finalBuffer.length / 1024 / 1024).toFixed(1)}MB`);

      const { error } = await this.supabaseService
        .getClient()
        .storage.from(bucket)
        .upload(`${jobId}/final.mp4`, finalBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload final video: ${error.message}`);
      }

      const { data } = this.supabaseService
        .getClient()
        .storage.from(bucket)
        .getPublicUrl(`${jobId}/final.mp4`);

      // Update job
      await this.jobsService.updateStatus(jobId, 'COMPLETED', {
        final_video_url: data.publicUrl,
      } as any);

      const durationMs = Date.now() - startTime;
      await this.jobsService.updateStepTiming(jobId, 'rendering', durationMs);

      this.logger.log(`Job ${jobId}: Rendering complete in ${durationMs}ms. URL: ${data.publicUrl}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Job ${jobId}: Rendering failed: ${message}`);
      try {
        await this.jobsService.updateStatus(jobId, 'FAILED', {
          error_message: `Rendering failed: ${message}`,
        } as any);
      } catch (updateError) {
        this.logger.error(`Could not update job ${jobId} to FAILED: ${updateError}`);
      }
    }
  }

  private async getRandomMusicUrl(): Promise<string | null> {
    try {
      const { data: files, error } = await this.supabaseService
        .getClient()
        .storage.from('music')
        .list('', { limit: 100 });

      if (error || !files || files.length === 0) {
        this.logger.warn('No music files found in "music" bucket');
        return null;
      }

      // Filter only audio files
      const audioFiles = files.filter((f) =>
        /\.(mp3|wav|ogg|m4a)$/i.test(f.name),
      );

      if (audioFiles.length === 0) {
        this.logger.warn('No audio files found in "music" bucket');
        return null;
      }

      // Pick one at random
      const picked = audioFiles[Math.floor(Math.random() * audioFiles.length)];
      this.logger.log(`Picked random music: ${picked.name} (from ${audioFiles.length} tracks)`);

      const { data } = this.supabaseService
        .getClient()
        .storage.from('music')
        .getPublicUrl(picked.name);

      return data.publicUrl;
    } catch (err) {
      this.logger.warn(`Could not fetch music from bucket: ${err}`);
      return null;
    }
  }
}
