import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../../common/gemini/gemini.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
export declare class VideoGenerationService {
    private readonly geminiService;
    private readonly supabaseService;
    private readonly jobsService;
    private readonly configService;
    private readonly logger;
    constructor(geminiService: GeminiService, supabaseService: SupabaseService, jobsService: JobsService, configService: ConfigService);
    generateVideos(jobId: string): Promise<void>;
    private retryOperation;
    private uploadBuffer;
    private downloadAndUpload;
}
