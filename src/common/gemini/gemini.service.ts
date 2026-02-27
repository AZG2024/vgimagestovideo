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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
