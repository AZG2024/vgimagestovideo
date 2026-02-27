import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class KlingService implements OnModuleInit {
    private readonly configService;
    private accessKey;
    private secretKey;
    private readonly baseUrl;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    private generateToken;
    createImageToVideoTask(imageUrl: string, prompt: string, duration?: '5' | '10', aspectRatio?: '16:9' | '9:16' | '1:1', model?: string): Promise<string>;
    pollTaskUntilDone(taskId: string, maxWaitMs?: number): Promise<string>;
    generateVideo(imageUrl: string, prompt: string, duration?: '5' | '10', aspectRatio?: '16:9' | '9:16' | '1:1'): Promise<string>;
    generateVideosParallel(tasks: Array<{
        imageUrl: string;
        prompt: string;
        duration: '5' | '10';
        aspectRatio: '16:9' | '9:16' | '1:1';
    }>, maxWaitMs?: number): Promise<string[]>;
    private delay;
}
