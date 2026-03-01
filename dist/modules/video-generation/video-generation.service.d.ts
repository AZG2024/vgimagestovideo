import { ConfigService } from '@nestjs/config';
import { WaveSpeedService } from '../../common/wavespeed/wavespeed.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
export declare class VideoGenerationService {
    private readonly waveSpeedService;
    private readonly supabaseService;
    private readonly jobsService;
    private readonly configService;
    private readonly logger;
    constructor(waveSpeedService: WaveSpeedService, supabaseService: SupabaseService, jobsService: JobsService, configService: ConfigService);
    generateVideos(jobId: string): Promise<void>;
    private retryOperation;
    private uploadBuffer;
    private downloadAndUpload;
}
