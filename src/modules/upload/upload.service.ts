import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
import { UploadDto } from './dto/upload.dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: UploadDto,
  ): Promise<{ jobId: string; originalImageUrl: string }> {
    const startTime = Date.now();

    // Create job
    const job = await this.jobsService.create({
      productCategory: dto.productCategory,
      stoneName: dto.stoneName,
    });

    await this.jobsService.updateStatus(job.id, 'UPLOADING');

    // Determine file extension from mime type
    const ext = file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : file.mimetype.split('/')[1];
    const storagePath = `${job.id}/original.${ext}`;
    const bucket = this.configService.get<string>('STORAGE_BUCKET')!;

    // Upload to Supabase Storage
    const { error: uploadError } = await this.supabaseService
      .getClient()
      .storage.from(bucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      await this.jobsService.updateStatus(job.id, 'FAILED', {
        error_message: `Upload failed: ${uploadError.message}`,
      } as any);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabaseService
      .getClient()
      .storage.from(bucket)
      .getPublicUrl(storagePath);

    const originalImageUrl = urlData.publicUrl;

    // Update job with image URL and set status back to PENDING (ready for next phase)
    await this.jobsService.updateStatus(job.id, 'PENDING', {
      original_image_url: originalImageUrl,
    } as any);

    const durationMs = Date.now() - startTime;
    await this.jobsService.updateStepTiming(job.id, 'upload', durationMs);

    this.logger.log(`Upload complete for job ${job.id} in ${durationMs}ms`);

    return { jobId: job.id, originalImageUrl };
  }
}
