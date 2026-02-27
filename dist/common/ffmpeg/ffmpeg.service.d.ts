import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class FfmpegService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    renderFinalVideo(video1Path: string, video2Path: string, video3Path: string, outputPath: string, voiceoverPath?: string, bgMusicPath?: string, transitionDuration?: number, video1Duration?: number, video2Duration?: number): Promise<void>;
}
