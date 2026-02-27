import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateJobDto } from './dto/create-job.dto';
export interface VideoJob {
    id: string;
    user_id: string | null;
    product_category: string;
    stone_name: string | null;
    original_image_url: string | null;
    premium_image_url: string | null;
    model_image_url: string | null;
    video1_url: string | null;
    video2_url: string | null;
    audio_url: string | null;
    subtitle_url: string | null;
    final_video_url: string | null;
    description_text: string | null;
    status: string;
    error_message: string | null;
    step_timings: Record<string, number>;
    created_at: string;
    updated_at: string;
}
export declare class JobsService {
    private readonly supabaseService;
    private readonly logger;
    constructor(supabaseService: SupabaseService);
    create(dto: CreateJobDto): Promise<VideoJob>;
    findById(id: string): Promise<VideoJob>;
    updateStatus(id: string, status: string, extras?: Partial<VideoJob>): Promise<VideoJob>;
    updateStepTiming(id: string, step: string, durationMs: number): Promise<void>;
}
