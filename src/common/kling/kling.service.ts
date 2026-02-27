import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

interface KlingTaskResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: string;
    task_status_msg?: string;
    task_result?: {
      videos?: Array<{
        id: string;
        url: string;
        duration: string;
      }>;
    };
  };
}

@Injectable()
export class KlingService implements OnModuleInit {
  private accessKey: string;
  private secretKey: string;
  private readonly baseUrl = 'https://api.klingai.com';
  private readonly logger = new Logger(KlingService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.accessKey = this.configService.get<string>('KLING_API_KEY')!;
    this.secretKey = this.configService.get<string>('KLING_SECRET_KEY')!;
    this.logger.log('Kling service initialized');
  }

  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.accessKey,
      iat: now - 5,
      nbf: now - 5,
      exp: now + 30 * 60, // 30 minutes
    };
    return jwt.sign(payload, this.secretKey, {
      algorithm: 'HS256',
      header: { alg: 'HS256', typ: 'JWT' },
    });
  }

  async createImageToVideoTask(
    imageUrl: string,
    prompt: string,
    duration: '5' | '10' = '10',
    aspectRatio: '16:9' | '9:16' | '1:1' = '9:16',
    model: string = 'kling-v2-master',
  ): Promise<string> {
    const token = this.generateToken();

    const body = {
      model_name: model,
      image: imageUrl,
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      mode: 'std',
    };

    this.logger.log(`Creating I2V task: model=${model}, duration=${duration}s, ratio=${aspectRatio}`);

    const response = await fetch(`${this.baseUrl}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as KlingTaskResponse;

    if (data.code !== 0) {
      throw new Error(`Kling create task failed: ${data.message} (code: ${data.code})`);
    }

    this.logger.log(`Task created: ${data.data.task_id}`);
    return data.data.task_id;
  }

  async pollTaskUntilDone(
    taskId: string,
    maxWaitMs: number = 10 * 60 * 1000,
  ): Promise<string> {
    const startTime = Date.now();
    let pollInterval = 5000; // Start at 5s

    while (Date.now() - startTime < maxWaitMs) {
      const token = this.generateToken();

      const response = await fetch(
        `${this.baseUrl}/v1/videos/image2video/${taskId}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = (await response.json()) as KlingTaskResponse;

      if (data.code !== 0) {
        throw new Error(`Kling poll failed: ${data.message}`);
      }

      const status = data.data.task_status;
      this.logger.log(`Task ${taskId} status: ${status}`);

      if (status === 'succeed') {
        const videoUrl = data.data.task_result?.videos?.[0]?.url;
        if (!videoUrl) {
          throw new Error('Task succeeded but no video URL found');
        }
        return videoUrl;
      }

      if (status === 'failed') {
        throw new Error(
          `Task failed: ${data.data.task_status_msg || 'Unknown error'}`,
        );
      }

      // Wait with exponential backoff (max 15s)
      await this.delay(pollInterval);
      pollInterval = Math.min(pollInterval * 1.5, 15000);
    }

    throw new Error(`Task ${taskId} timed out after ${maxWaitMs / 1000}s`);
  }

  async generateVideo(
    imageUrl: string,
    prompt: string,
    duration: '5' | '10' = '10',
    aspectRatio: '16:9' | '9:16' | '1:1' = '9:16',
  ): Promise<string> {
    const taskId = await this.createImageToVideoTask(
      imageUrl,
      prompt,
      duration,
      aspectRatio,
    );
    return this.pollTaskUntilDone(taskId);
  }

  async generateVideosParallel(
    tasks: Array<{
      imageUrl: string;
      prompt: string;
      duration: '5' | '10';
      aspectRatio: '16:9' | '9:16' | '1:1';
    }>,
    maxWaitMs: number = 10 * 60 * 1000,
  ): Promise<string[]> {
    // Create all tasks in parallel
    this.logger.log(`Creating ${tasks.length} video tasks in parallel...`);
    const taskIds = await Promise.all(
      tasks.map((t) =>
        this.createImageToVideoTask(t.imageUrl, t.prompt, t.duration, t.aspectRatio),
      ),
    );
    this.logger.log(`All tasks created: ${taskIds.join(', ')}`);

    // Poll all tasks in a single loop
    const startTime = Date.now();
    let pollInterval = 5000;
    const results: (string | null)[] = new Array(taskIds.length).fill(null);

    while (Date.now() - startTime < maxWaitMs) {
      const pending = taskIds.filter((_, i) => results[i] === null);
      if (pending.length === 0) break;

      const token = this.generateToken();

      for (let i = 0; i < taskIds.length; i++) {
        if (results[i] !== null) continue;

        const response = await fetch(
          `${this.baseUrl}/v1/videos/image2video/${taskIds[i]}`,
          { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await response.json()) as KlingTaskResponse;

        if (data.code !== 0) {
          throw new Error(`Kling poll failed for task ${taskIds[i]}: ${data.message}`);
        }

        const status = data.data.task_status;
        this.logger.log(`Task ${taskIds[i]} status: ${status}`);

        if (status === 'succeed') {
          const videoUrl = data.data.task_result?.videos?.[0]?.url;
          if (!videoUrl) throw new Error(`Task ${taskIds[i]} succeeded but no video URL`);
          results[i] = videoUrl;
          this.logger.log(`Task ${taskIds[i]} completed!`);
        } else if (status === 'failed') {
          throw new Error(
            `Task ${taskIds[i]} failed: ${data.data.task_status_msg || 'Unknown error'}`,
          );
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
