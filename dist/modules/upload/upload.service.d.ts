import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
import { UploadDto } from './dto/upload.dto';
export declare class UploadService {
    private readonly supabaseService;
    private readonly jobsService;
    private readonly configService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, jobsService: JobsService, configService: ConfigService);
    upload(file: Express.Multer.File, dto: UploadDto): Promise<{
        jobId: string;
        originalImageUrl: string;
    }>;
}
