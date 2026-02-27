import { VideoGenerationService } from './video-generation.service';
export declare class VideoGenerationController {
    private readonly videoGenerationService;
    private readonly logger;
    constructor(videoGenerationService: VideoGenerationService);
    generateVideos(id: string): Promise<{
        status: string;
        jobId: string;
    }>;
}
