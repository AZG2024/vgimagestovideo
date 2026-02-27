import { VideoRenderingService } from './video-rendering.service';
export declare class VideoRenderingController {
    private readonly videoRenderingService;
    private readonly logger;
    constructor(videoRenderingService: VideoRenderingService);
    renderVideo(id: string): Promise<{
        status: string;
        jobId: string;
    }>;
}
