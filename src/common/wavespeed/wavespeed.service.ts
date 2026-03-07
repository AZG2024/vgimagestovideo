import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface WaveSpeedResponse {
  code: number;
  message: string;
  data: {
    id: string;
    model: string;
    outputs: string[] | null;
    status: string;
    created_at: string;
    has_nsfw_contents: boolean[];
    timings: { inference: number } | null;
    error: string;
  };
}

@Injectable()
export class WaveSpeedService implements OnModuleInit {
  private apiKey: string;
  private readonly baseUrl = 'https://api.wavespeed.ai/api/v3';
  private readonly logger = new Logger(WaveSpeedService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('WAVESPEED_API_KEY')!;
    this.logger.log('WaveSpeed service initialized');
  }

  async createImageToVideoTask(
    imageUrl: string,
    prompt: string,
    duration: number = 5,
  ): Promise<string> {
    const body = {
      image: imageUrl,
      prompt,
      duration,
      aspect_ratio: '9:16',
    };

    this.logger.log(`Creating I2V task (Kling O3 Pro): duration=${duration}s, image=${imageUrl.substring(0, 80)}...`);

    const response = await fetch(
      `${this.baseUrl}/kwaivgi/kling-video-o3-pro/image-to-video`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      },
    );

    const data = (await response.json()) as WaveSpeedResponse;

    if (data.code !== 200) {
      throw new Error(`WaveSpeed create task failed: ${data.message} (code: ${data.code})`);
    }

    this.logger.log(`Task created: ${data.data.id}`);
    return data.data.id;
  }

  async pollTaskUntilDone(
    taskId: string,
    maxWaitMs: number = 10 * 60 * 1000,
  ): Promise<string> {
    const startTime = Date.now();
    let pollInterval = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      const response = await fetch(
        `${this.baseUrl}/predictions/${taskId}/result`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.apiKey}` },
        },
      );

      const data = (await response.json()) as WaveSpeedResponse;

      if (data.code !== 200) {
        throw new Error(`WaveSpeed poll failed: ${data.message}`);
      }

      const status = data.data.status;
      this.logger.log(`Task ${taskId} status: ${status}`);

      if (status === 'completed') {
        const videoUrl = data.data.outputs?.[0];
        if (!videoUrl) {
          throw new Error('Task completed but no video URL found');
        }
        return videoUrl;
      }

      if (status === 'failed') {
        this.logger.error(`Task ${taskId} failed. Full response: ${JSON.stringify(data).substring(0, 1000)}`);
        throw new Error(`Task failed: ${data.data.error || 'Unknown error'}`);
      }

      await this.delay(pollInterval);
      pollInterval = Math.min(pollInterval * 1.5, 15000);
    }

    throw new Error(`Task ${taskId} timed out after ${maxWaitMs / 1000}s`);
  }

  async generateVideo(
    imageUrl: string,
    prompt: string,
    duration: number = 5,
  ): Promise<string> {
    const taskId = await this.createImageToVideoTask(imageUrl, prompt, duration);
    return this.pollTaskUntilDone(taskId);
  }

  async generateVideosParallel(
    tasks: Array<{
      imageUrl: string;
      prompt: string;
      duration: number;
    }>,
    maxWaitMs: number = 10 * 60 * 1000,
  ): Promise<string[]> {
    // Create all tasks in parallel
    this.logger.log(`Creating ${tasks.length} video tasks in parallel...`);
    const taskIds = await Promise.all(
      tasks.map((t) => this.createImageToVideoTask(t.imageUrl, t.prompt, t.duration)),
    );
    this.logger.log(`All tasks created: ${taskIds.join(', ')}`);

    // Poll all tasks in a single loop
    const startTime = Date.now();
    let pollInterval = 5000;
    const results: (string | null)[] = new Array(taskIds.length).fill(null);

    while (Date.now() - startTime < maxWaitMs) {
      if (results.every((r) => r !== null)) break;

      for (let i = 0; i < taskIds.length; i++) {
        if (results[i] !== null) continue;

        const response = await fetch(
          `${this.baseUrl}/predictions/${taskIds[i]}/result`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${this.apiKey}` },
          },
        );
        const data = (await response.json()) as WaveSpeedResponse;

        if (data.code !== 200) {
          throw new Error(`WaveSpeed poll failed for task ${taskIds[i]}: ${data.message}`);
        }

        const status = data.data.status;
        this.logger.log(`Task ${taskIds[i]} status: ${status}`);

        if (status === 'completed') {
          const videoUrl = data.data.outputs?.[0];
          if (!videoUrl) throw new Error(`Task ${taskIds[i]} completed but no video URL`);
          results[i] = videoUrl;
          this.logger.log(`Task ${taskIds[i]} completed!`);
        } else if (status === 'failed') {
          throw new Error(`Task ${taskIds[i]} failed: ${data.data.error || 'Unknown error'}`);
        }
      }

      if (results.every((r) => r !== null)) break;

      await this.delay(pollInterval);
      pollInterval = Math.min(pollInterval * 1.5, 15000);
    }

    if (results.some((r) => r === null)) {
      throw new Error(`Some tasks timed out after ${maxWaitMs / 1000}s`);
    }

    return results as string[];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
