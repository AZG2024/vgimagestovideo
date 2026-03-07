import { ConfigService } from '@nestjs/config';
import { ShotstackService } from '../../common/shotstack/shotstack.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
export declare class VideoRenderingService {
    private readonly shotstackService;
    private readonly supabaseService;
    private readonly jobsService;
    private readonly configService;
    private readonly logger;
    constructor(shotstackService: ShotstackService, supabaseService: SupabaseService, jobsService: JobsService, configService: ConfigService);
    renderVideo(jobId: string): Promise<void>;
    private getRandomMusicUrl;
}
