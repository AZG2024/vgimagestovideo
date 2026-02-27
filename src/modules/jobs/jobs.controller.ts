import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async create(@Body() dto: CreateJobDto) {
    const job = await this.jobsService.create(dto);
    return { id: job.id, status: job.status };
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findById(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id', ParseUUIDPipe) id: string) {
    const job = await this.jobsService.findById(id);
    return { id: job.id, status: job.status };
  }

  @Post(':id/skip-images')
  async skipImages(@Param('id', ParseUUIDPipe) id: string) {
    const job = await this.jobsService.findById(id);
    if (!job.original_image_url) {
      return { error: 'Job has no original image. Upload one first.' };
    }
    const updated = await this.jobsService.updateStatus(id, 'PENDING', {
      premium_image_url: job.original_image_url,
      model_image_url: job.original_image_url,
    } as any);
    return { id: updated.id, premium_image_url: updated.premium_image_url, model_image_url: updated.model_image_url };
  }
}
