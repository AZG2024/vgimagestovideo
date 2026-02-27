import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class GeminiService implements OnModuleInit {
    private readonly configService;
    private ai;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    generateImageFromImage(imageBuffer: Buffer, mimeType: string, prompt: string, aspectRatio?: string): Promise<Buffer>;
    private delay;
}
