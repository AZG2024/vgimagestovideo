import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FfmpegService } from '../../common/ffmpeg/ffmpeg.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class VideoRenderingService {
  private readonly logger = new Logger(VideoRenderingService.name);

  constructor(
    private readonly ffmpegService: FfmpegService,
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

    const tmpDir = path.join(os.tmpdir(), `video-render-${jobId}`);

    try {
      // Create temp directory
      fs.mkdirSync(tmpDir, { recursive: true });

      const video1Path = path.join(tmpDir, 'video1.mp4');
      const video2Path = path.join(tmpDir, 'video2.mp4');
      const voiceoverPath = path.join(tmpDir, 'voiceover.mp3');
      const bgMusicPath = path.join(tmpDir, 'bgmusic.mp3');
      const outputPath = path.join(tmpDir, 'final.mp4');

      // Download all assets in parallel
      this.logger.log(`Job ${jobId}: Downloading assets for rendering...`);
      const downloads: Promise<void>[] = [
        this.downloadFile(job.video1_url, video1Path),
        this.downloadFile(job.video2_url, video2Path),
      ];

      let hasVoiceover = false;
      let hasBgMusic = false;

      if (job.audio_url) {
        downloads.push(this.downloadFile(job.audio_url, voiceoverPath));
        hasVoiceover = true;
      }

      // Background music: pick a random track from the "music" bucket
      const bgMusicUrl = await this.getRandomMusicUrl();
      if (bgMusicUrl) {
        downloads.push(this.downloadFile(bgMusicUrl, bgMusicPath));
        hasBgMusic = true;
        this.logger.log(`Job ${jobId}: Selected background music: ${bgMusicUrl}`);
      }

      await Promise.all(downloads);

      // Render with FFmpeg: video1(5s) → video2(8s) → video2(8s) = ~19s with 2 crossfades
      this.logger.log(`Job ${jobId}: Starting FFmpeg rendering (voice: ${hasVoiceover}, music: ${hasBgMusic})...`);
      await this.ffmpegService.renderFinalVideo(
        video1Path,
        video2Path,
        video2Path,  // reuse video2 as third clip for ~19s total
        outputPath,
        hasVoiceover ? voiceoverPath : undefined,
        hasBgMusic ? bgMusicPath : undefined,
        1,   // transitionDuration
        5,   // video1Duration
        8,   // video2Duration
      );

      // Upload final video to Supabase
      this.logger.log(`Job ${jobId}: Uploading final video...`);
      const bucket = this.configService.get<string>('STORAGE_BUCKET')!;
      const finalBuffer = fs.readFileSync(outputPath);

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
    } finally {
      // Cleanup temp files
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        this.logger.log(`Cleaned up temp dir: ${tmpDir}`);
      } catch {
        this.logger.warn(`Could not clean up temp dir: ${tmpDir}`);
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

  private async downloadFile(url: string, destPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    this.logger.log(`Downloaded ${path.basename(destPath)} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
  }
}
