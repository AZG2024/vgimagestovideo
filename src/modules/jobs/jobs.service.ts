import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  aspect_ratio: string;
  status: string;
  error_message: string | null;
  step_timings: Record<string, number>;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(dto: CreateJobDto): Promise<VideoJob> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('video_jobs')
      .insert({
        user_id: dto.userId ?? null,
        product_category: dto.productCategory,
        stone_name: dto.stoneName ?? null,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create job: ${error.message}`);
      throw new Error(`Failed to create job: ${error.message}`);
    }

    this.logger.log(`Job created: ${data.id}`);
    return data as VideoJob;
  }

  async findById(id: string): Promise<VideoJob> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('video_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return data as VideoJob;
  }

  async updateStatus(
    id: string,
    status: string,
    extras?: Partial<VideoJob>,
  ): Promise<VideoJob> {
    const updateData: Record<string, unknown> = { status, ...extras };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('video_jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update job ${id}: ${error.message}`);
      throw new Error(`Failed to update job ${id}: ${error.message}`);
    }

    this.logger.log(`Job ${id} status updated to ${status}`);
    return data as VideoJob;
  }

  async updateStepTiming(
    id: string,
    step: string,
    durationMs: number,
  ): Promise<void> {
    const job = await this.findById(id);
    const timings = { ...job.step_timings, [step]: durationMs };

    await this.supabaseService
      .getClient()
      .from('video_jobs')
      .update({ step_timings: timings })
      .eq('id', id);

    this.logger.log(`Job ${id} step timing: ${step} = ${durationMs}ms`);
  }
}
