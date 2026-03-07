import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ShotstackRenderResponse {
  success: boolean;
  message: string;
  response: {
    id: string;
    message: string;
  };
}

interface ShotstackStatusResponse {
  success: boolean;
  message: string;
  response: {
    id: string;
    status: string;
    url?: string;
    error?: string;
  };
}

@Injectable()
export class ShotstackService implements OnModuleInit {
  private apiKey: string;
  private readonly baseUrl = 'https://api.shotstack.io/edit/stage';
  private readonly logger = new Logger(ShotstackService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('SHOTSTACK_API_KEY')!;
    const env = this.configService.get<string>('SHOTSTACK_ENV') || 'stage';
    if (env === 'production') {
      (this as any).baseUrl = 'https://api.shotstack.io/edit/v1';
    }
    this.logger.log(`Shotstack service initialized (env: ${env})`);
  }

  async renderFinalVideo(
    video1Url: string,
    video2Url: string,
    video3Url: string | null,
    voiceoverUrl?: string,
    bgMusicUrl?: string,
    transitionDuration: number = 1,
    video1Duration: number = 5,
    video2Duration: number = 10,
    aspectRatio: string = '9:16',
  ): Promise<string> {
    const isSquare = aspectRatio === '1:1';

    // Build video clips based on aspect ratio
    let videoClips: any[];
    let totalDuration: number;

    if (isSquare) {
      // 1:1: 2 clips with crossfade
      totalDuration = video1Duration + video2Duration - transitionDuration;
      videoClips = [
        {
          asset: { type: 'video', src: video1Url, volume: 0 },
          start: 0,
          length: video1Duration,
          fit: 'cover',
          transition: { out: 'fade' },
        },
        {
          asset: { type: 'video', src: video2Url, volume: 0 },
          start: video1Duration - transitionDuration,
          length: video2Duration,
          fit: 'cover',
          transition: { in: 'fade' },
        },
      ];
    } else {
      // 9:16: 3 clips with crossfades
      const video3Duration = video1Duration;
      totalDuration = video1Duration + video2Duration + video3Duration - 2 * transitionDuration;
      videoClips = [
        {
          asset: { type: 'video', src: video1Url, volume: 0 },
          start: 0,
          length: video1Duration,
          fit: 'cover',
          transition: { out: 'fade' },
        },
        {
          asset: { type: 'video', src: video2Url, volume: 0 },
          start: video1Duration - transitionDuration,
          length: video2Duration,
          fit: 'cover',
          transition: { in: 'fade', out: 'fade' },
        },
        {
          asset: { type: 'video', src: video3Url!, volume: 0 },
          start: video1Duration + video2Duration - 2 * transitionDuration,
          length: video3Duration,
          fit: 'cover',
          transition: { in: 'fade' },
        },
      ];
    }

    const tracks: any[] = [{ clips: videoClips }];

    // Add voiceover track
    if (voiceoverUrl) {
      tracks.push({
        clips: [
          {
            asset: { type: 'audio', src: voiceoverUrl, volume: 1 },
            start: 0,
            length: totalDuration,
          },
        ],
      });
    }

    // Add background music track
    if (bgMusicUrl) {
      tracks.push({
        clips: [
          {
            asset: { type: 'audio', src: bgMusicUrl, volume: 0.15 },
            start: 0,
            length: totalDuration,
          },
        ],
      });
    }

    const outputSize = isSquare
      ? { width: 1080, height: 1080 }
      : { width: 1080, height: 1920 };

    const body = {
      timeline: {
        tracks,
      },
      output: {
        format: 'mp4',
        size: outputSize,
      },
    };

    const clipCount = isSquare ? 2 : 3;
    this.logger.log(
      `Submitting render: ${clipCount} clips (${aspectRatio}, crossfade ${transitionDuration}s), voice: ${!!voiceoverUrl}, music: ${!!bgMusicUrl}, duration: ~${totalDuration}s`,
    );

    // Submit render job
    const renderResponse = await fetch(`${this.baseUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    const renderData = await renderResponse.json();
    this.logger.log(`Shotstack response: ${JSON.stringify(renderData).substring(0, 500)}`);

    if (!renderData.success) {
      throw new Error(`Shotstack render failed: ${renderData.message || JSON.stringify(renderData)}`);
    }

    const renderId = renderData.response.id;
    this.logger.log(`Render submitted: ${renderId}`);

    // Poll until done
    return this.pollRenderUntilDone(renderId);
  }

  private async pollRenderUntilDone(
    renderId: string,
    maxWaitMs: number = 10 * 60 * 1000,
  ): Promise<string> {
    const startTime = Date.now();
    let pollInterval = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      await this.delay(pollInterval);

      const response = await fetch(`${this.baseUrl}/render/${renderId}`, {
        method: 'GET',
        headers: { 'x-api-key': this.apiKey },
      });

      const data = (await response.json()) as ShotstackStatusResponse;

      if (!data.success) {
        throw new Error(`Shotstack poll failed: ${data.message}`);
      }

      const status = data.response.status;
      this.logger.log(`Render ${renderId} status: ${status}`);

      if (status === 'done') {
        const videoUrl = data.response.url;
        if (!videoUrl) {
          throw new Error('Render completed but no video URL returned');
        }
        this.logger.log(`Render complete: ${videoUrl}`);
        return videoUrl;
      }

      if (status === 'failed') {
        throw new Error(
          `Render failed: ${data.response.error || 'Unknown error'}`,
        );
      }

      pollInterval = Math.min(pollInterval * 1.5, 15000);
    }

    throw new Error(`Render ${renderId} timed out after ${maxWaitMs / 1000}s`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
