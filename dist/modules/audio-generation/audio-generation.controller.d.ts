import { AudioGenerationService } from './audio-generation.service';
export declare class AudioGenerationController {
    private readonly audioGenerationService;
    private readonly logger;
    constructor(audioGenerationService: AudioGenerationService);
    generateAudio(id: string): Promise<{
        status: string;
        jobId: string;
    }>;
}
