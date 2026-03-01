import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../../common/gemini/gemini.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
export declare class ImageGenerationService {
    private readonly geminiService;
    private readonly supabaseService;
    private readonly jobsService;
    private readonly configService;
    private readonly logger;
    constructor(geminiService: GeminiService, supabaseService: SupabaseService, jobsService: JobsService, configService: ConfigService);
    generateImages(jobId: string, aspectRatio?: string): Promise<{
        premiumImageUrl: string;
        modelImageUrl: string;
    }>;
    private downloadImage;
    private uploadImage;
}
