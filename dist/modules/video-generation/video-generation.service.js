"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VideoGenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoGenerationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const wavespeed_service_1 = require("../../common/wavespeed/wavespeed.service");
const supabase_service_1 = require("../../common/supabase/supabase.service");
const jobs_service_1 = require("../jobs/jobs.service");
const VIDEO_PROMPT_PREMIUM = 'Smooth cinematic camera movement, slow zoom in with gentle panning, professional product showcase, elegant lighting transitions, luxury commercial feel';
const VIDEO_PROMPT_MODEL = 'A female model wearing the necklace around her neck, smooth cinematic camera movement, gentle panning around the model, professional fashion showcase, elegant studio lighting, luxury e-commerce feel';
let VideoGenerationService = VideoGenerationService_1 = class VideoGenerationService {
    waveSpeedService;
    supabaseService;
    jobsService;
    configService;
    logger = new common_1.Logger(VideoGenerationService_1.name);
    constructor(waveSpeedService, supabaseService, jobsService, configService) {
        this.waveSpeedService = waveSpeedService;
        this.supabaseService = supabaseService;
        this.jobsService = jobsService;
        this.configService = configService;
    }
    async generateVideos(jobId) {
        const startTime = Date.now();
        const job = await this.jobsService.findById(jobId);
        if (!job.premium_image_url || !job.model_image_url) {
            throw new Error(`Job ${jobId} is missing generated images. Run image generation first.`);
        }
        await this.jobsService.updateStatus(jobId, 'PROCESSING_VIDEOS');
        try {
            const bucket = this.configService.get('STORAGE_BUCKET');
            this.logger.log(`Job ${jobId}: Premium image URL: ${job.premium_image_url}`);
            this.logger.log(`Job ${jobId}: Model image URL: ${job.model_image_url}`);
            this.logger.log(`Job ${jobId}: Generating video 1 (premium) via Kling O1...`);
            const video1WsUrl = await this.waveSpeedService.generateVideo(job.premium_image_url, VIDEO_PROMPT_PREMIUM, 5);
            this.logger.log(`Job ${jobId}: Generating video 2 (model) via Kling O1...`);
            const video2WsUrl = await this.waveSpeedService.generateVideo(job.model_image_url, VIDEO_PROMPT_MODEL, 10);
            this.logger.log(`Job ${jobId}: Both videos ready, uploading to storage...`);
            const [video1Url, video2Url] = await Promise.all([
                this.retryOperation(() => this.downloadAndUpload(video1WsUrl, bucket, `${jobId}/video1.mp4`), 'download/upload video 1'),
                this.retryOperation(() => this.downloadAndUpload(video2WsUrl, bucket, `${jobId}/video2.mp4`), 'download/upload video 2'),
            ]);
            await this.retryOperation(() => this.jobsService.updateStatus(jobId, 'PENDING', {
                video1_url: video1Url,
                video2_url: video2Url,
            }), 'update job status');
            const durationMs = Date.now() - startTime;
            await this.retryOperation(() => this.jobsService.updateStepTiming(jobId, 'video_generation', durationMs), 'update step timing');
            this.logger.log(`Job ${jobId}: Video generation complete in ${durationMs}ms`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Job ${jobId}: Video generation failed: ${message}`);
            try {
                await this.retryOperation(() => this.jobsService.updateStatus(jobId, 'FAILED', {
                    error_message: `Video generation failed: ${message}`,
                }), 'update job to FAILED');
            }
            catch (updateError) {
                this.logger.error(`Could not update job ${jobId} to FAILED: ${updateError}`);
            }
        }
    }
    async retryOperation(operation, label, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Attempt ${attempt}/${maxRetries} failed for "${label}": ${msg}`);
                if (attempt === maxRetries) {
                    throw error;
                }
                const delayMs = attempt * 2000;
                this.logger.log(`Retrying "${label}" in ${delayMs}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
        throw new Error(`Unreachable`);
    }
    async uploadBuffer(buffer, bucket, path) {
        this.logger.log(`Uploading ${path} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
        const { error } = await this.supabaseService
            .getClient()
            .storage.from(bucket)
            .upload(path, buffer, {
            contentType: 'video/mp4',
            upsert: true,
        });
        if (error) {
            throw new Error(`Failed to upload ${path}: ${error.message}`);
        }
        const { data } = this.supabaseService
            .getClient()
            .storage.from(bucket)
            .getPublicUrl(path);
        return data.publicUrl;
    }
    async downloadAndUpload(sourceUrl, bucket, path) {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return this.uploadBuffer(buffer, bucket, path);
    }
};
exports.VideoGenerationService = VideoGenerationService;
exports.VideoGenerationService = VideoGenerationService = VideoGenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [wavespeed_service_1.WaveSpeedService,
        supabase_service_1.SupabaseService,
        jobs_service_1.JobsService,
        config_1.ConfigService])
], VideoGenerationService);
//# sourceMappingURL=video-generation.service.js.map