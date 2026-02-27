import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class WaveSpeedService implements OnModuleInit {
    private readonly configService;
    private apiKey;
    private readonly baseUrl;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    createImageToVideoTask(imageUrl: string, prompt: string, duration?: number): Promise<string>;
    pollTaskUntilDone(taskId: string, maxWaitMs?: number): Promise<string>;
    generateVideo(imageUrl: string, prompt: string, duration?: number): Promise<string>;
    generateVideosParallel(tasks: Array<{
        imageUrl: string;
        prompt: string;
        duration: number;
    }>, maxWaitMs?: number): Promise<string[]>;
    private delay;
}
