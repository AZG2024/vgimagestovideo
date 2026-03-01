import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService implements OnModuleInit {
  private ai: GoogleGenAI;
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')!;
    this.ai = new GoogleGenAI({ apiKey });
    this.logger.log('Gemini client initialized');
  }

  async generateImageFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt: string,
    aspectRatio: string = '9:16',
  ): Promise<Buffer> {
    const base64Image = imageBuffer.toString('base64');

    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ];

    const maxRetries = 1;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.warn(`Retry attempt ${attempt} for image generation`);
          await this.delay(2000 * attempt);
        }

        const response = await this.ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents,
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio,
            },
          },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) {
          throw new Error('No content parts in Gemini response');
        }

        for (const part of parts) {
          if (part.inlineData?.data) {
            const buffer = Buffer.from(part.inlineData.data, 'base64');
            this.logger.log(
              `Image generated successfully (${(buffer.length / 1024).toFixed(0)}KB)`,
            );
            return buffer;
          }
        }

        throw new Error('No image data found in Gemini response');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Image generation failed (attempt ${attempt + 1}): ${lastError.message}`,
        );
      }
    }

    throw lastError ?? new Error('Image generation failed');
  }

  /**
   * Generate a video from an image using Google Veo 3.1.
   * Returns the video as a Buffer (MP4).
   */
  async generateVideoFromImage(
    imageUrl: string,
    prompt: string,
    durationSeconds: 4 | 6 | 8 = 8,
    aspectRatio: '9:16' | '16:9' | '1:1' = '9:16',
  ): Promise<Buffer> {
    // Download image from public URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');

    const mimeType =
      imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png';

    this.logger.log(
      `Veo 3.1: Generating ${durationSeconds}s video (${aspectRatio}) from image (${(imageBuffer.length / 1024).toFixed(0)}KB)`,
    );

    const maxRetries = 1;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.warn(`Retry attempt ${attempt} for video generation`);
          await this.delay(5000 * attempt);
        }

        // Call Veo 3.1
        let operation = await this.ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt,
          image: {
            imageBytes: base64Image,
            mimeType,
          },
          config: {
            aspectRatio,
            durationSeconds,
            numberOfVideos: 1,
          },
        });

        // Poll until done
        const maxWaitMs = 10 * 60 * 1000; // 10 minutes
        const startTime = Date.now();
        let pollInterval = 5000;

        while (!operation.done) {
          if (Date.now() - startTime > maxWaitMs) {
            throw new Error('Veo video generation timed out after 10 minutes');
          }
          await this.delay(pollInterval);
          operation = await this.ai.operations.getVideosOperation({
            operation,
          });
          pollInterval = Math.min(pollInterval * 1.5, 15000);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          this.logger.log(`Veo polling... elapsed=${elapsed}s, done=${operation.done}`);
        }

        // Extract video from response
        const response = (operation as any).response;
        this.logger.log(`Veo response keys: ${JSON.stringify(Object.keys(response || {}))}`);

        const generatedVideo = response?.generatedVideos?.[0];
        if (!generatedVideo) {
          this.logger.error(`Veo full response: ${JSON.stringify(response, null, 2).substring(0, 2000)}`);
          throw new Error('Veo operation completed but no generated video found');
        }

        this.logger.log(`Generated video keys: ${JSON.stringify(Object.keys(generatedVideo || {}))}`);

        // Handle video bytes (inline) or video URI
        if (generatedVideo.video?.videoBytes) {
          const videoBuffer = Buffer.from(generatedVideo.video.videoBytes, 'base64');
          this.logger.log(
            `Video generated successfully via bytes (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB)`,
          );
          return videoBuffer;
        }

        // Try URI-based response - needs API key auth
        const videoUri = generatedVideo.video?.uri || generatedVideo.uri;
        if (videoUri) {
          this.logger.log(`Video available at URI: ${videoUri}, downloading...`);
          const apiKey = this.configService.get<string>('GEMINI_API_KEY')!;

          // Try with API key as query param first
          let downloadUrl = videoUri;
          if (downloadUrl.includes('generativelanguage.googleapis.com')) {
            const separator = downloadUrl.includes('?') ? '&' : '?';
            downloadUrl = `${downloadUrl}${separator}key=${apiKey}`;
          }

          const videoResponse = await fetch(downloadUrl, {
            headers: {
              'x-goog-api-key': apiKey,
            },
          });
          if (!videoResponse.ok) {
            // Log the actual error body for debugging
            const errorBody = await videoResponse.text();
            this.logger.error(`Download failed (${videoResponse.status}): ${errorBody.substring(0, 500)}`);
            throw new Error(`Failed to download video from URI: ${videoResponse.status} ${videoResponse.statusText}`);
          }
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          this.logger.log(
            `Video downloaded successfully (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB)`,
          );
          return videoBuffer;
        }

        this.logger.error(`Veo generatedVideo structure: ${JSON.stringify(generatedVideo, null, 2).substring(0, 2000)}`);
        throw new Error('Veo operation completed but no video bytes or URI found');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Video generation failed (attempt ${attempt + 1}): ${lastError.message}`,
        );
      }
    }

    throw lastError ?? new Error('Video generation failed');
  }

  /**
   * Generate multiple videos in parallel using Veo 3.1.
   */
  async generateVideosFromImagesParallel(
    tasks: Array<{
      imageUrl: string;
      prompt: string;
      durationSeconds: 4 | 6 | 8;
    }>,
  ): Promise<Buffer[]> {
    this.logger.log(`Starting ${tasks.length} Veo video generations in parallel...`);
    const results = await Promise.all(
      tasks.map((t) =>
        this.generateVideoFromImage(t.imageUrl, t.prompt, t.durationSeconds),
      ),
    );
    this.logger.log(`All ${tasks.length} videos generated successfully`);
    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
