import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class GeminiService implements OnModuleInit {
    private readonly configService;
    private ai;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    generateImageFromImage(imageBuffer: Buffer, mimeType: string, prompt: string, aspectRatio?: string): Promise<Buffer>;
    generateVideoFromImage(imageUrl: string, prompt: string, durationSeconds?: 4 | 6 | 8, aspectRatio?: '9:16' | '16:9' | '1:1'): Promise<Buffer>;
    generateVideosFromImagesParallel(tasks: Array<{
        imageUrl: string;
        prompt: string;
        durationSeconds: 4 | 6 | 8;
    }>): Promise<Buffer[]>;
    private delay;
}
