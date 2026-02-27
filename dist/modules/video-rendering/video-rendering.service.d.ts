import { ConfigService } from '@nestjs/config';
import { FfmpegService } from '../../common/ffmpeg/ffmpeg.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
export declare class VideoRenderingService {
    private readonly ffmpegService;
    private readonly supabaseService;
    private readonly jobsService;
    private readonly configService;
    private readonly logger;
    constructor(ffmpegService: FfmpegService, supabaseService: SupabaseService, jobsService: JobsService, configService: ConfigService);
    renderVideo(jobId: string): Promise<void>;
    private getRandomMusicUrl;
    private downloadFile;
}
