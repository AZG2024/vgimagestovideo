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
var VideoRenderingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoRenderingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const shotstack_service_1 = require("../../common/shotstack/shotstack.service");
const supabase_service_1 = require("../../common/supabase/supabase.service");
const jobs_service_1 = require("../jobs/jobs.service");
let VideoRenderingService = VideoRenderingService_1 = class VideoRenderingService {
    shotstackService;
    supabaseService;
    jobsService;
    configService;
    logger = new common_1.Logger(VideoRenderingService_1.name);
    constructor(shotstackService, supabaseService, jobsService, configService) {
        this.shotstackService = shotstackService;
        this.supabaseService = supabaseService;
        this.jobsService = jobsService;
        this.configService = configService;
    }
    async renderVideo(jobId) {
        const startTime = Date.now();
        const job = await this.jobsService.findById(jobId);
        if (!job.video1_url || !job.video2_url) {
            throw new Error(`Job ${jobId} is missing videos. Run video generation first.`);
        }
        await this.jobsService.updateStatus(jobId, 'RENDERING');
        try {
            const bgMusicUrl = await this.getRandomMusicUrl();
            if (bgMusicUrl) {
                this.logger.log(`Job ${jobId}: Selected background music: ${bgMusicUrl}`);
            }
            this.logger.log(`Job ${jobId}: Starting Shotstack rendering (voice: ${!!job.audio_url}, music: ${!!bgMusicUrl})...`);
            const renderedVideoUrl = await this.shotstackService.renderFinalVideo(job.video1_url, job.video2_url, job.video1_url, job.audio_url || undefined, bgMusicUrl || undefined);
            this.logger.log(`Job ${jobId}: Uploading final video to storage...`);
            const bucket = this.configService.get('STORAGE_BUCKET');
            const response = await fetch(renderedVideoUrl);
            if (!response.ok) {
                throw new Error(`Failed to download rendered video: ${response.statusText}`);
            }
            const finalBuffer = Buffer.from(await response.arrayBuffer());
            this.logger.log(`Final video size: ${(finalBuffer.length / 1024 / 1024).toFixed(1)}MB`);
            const { error } = await this.supabaseService
                .getClient()
                .storage.from(bucket)
                .upload(`${jobId}/final.mp4`, finalBuffer, {
                contentType: 'video/mp4',
                upsert: true,
            });
            if (error) {
                throw new Error(`Failed to upload final video: ${error.message}`);
            }
            const { data } = this.supabaseService
                .getClient()
                .storage.from(bucket)
                .getPublicUrl(`${jobId}/final.mp4`);
            await this.jobsService.updateStatus(jobId, 'COMPLETED', {
                final_video_url: data.publicUrl,
            });
            const durationMs = Date.now() - startTime;
            await this.jobsService.updateStepTiming(jobId, 'rendering', durationMs);
            this.logger.log(`Job ${jobId}: Rendering complete in ${durationMs}ms. URL: ${data.publicUrl}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Job ${jobId}: Rendering failed: ${message}`);
            try {
                await this.jobsService.updateStatus(jobId, 'FAILED', {
                    error_message: `Rendering failed: ${message}`,
                });
            }
            catch (updateError) {
                this.logger.error(`Could not update job ${jobId} to FAILED: ${updateError}`);
            }
        }
    }
    async getRandomMusicUrl() {
        try {
            const { data: files, error } = await this.supabaseService
                .getClient()
                .storage.from('music')
                .list('', { limit: 100 });
            if (error || !files || files.length === 0) {
                this.logger.warn('No music files found in "music" bucket');
                return null;
            }
            const audioFiles = files.filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f.name));
            if (audioFiles.length === 0) {
                this.logger.warn('No audio files found in "music" bucket');
                return null;
            }
            const picked = audioFiles[Math.floor(Math.random() * audioFiles.length)];
            this.logger.log(`Picked random music: ${picked.name} (from ${audioFiles.length} tracks)`);
            const { data } = this.supabaseService
                .getClient()
                .storage.from('music')
                .getPublicUrl(picked.name);
            return data.publicUrl;
        }
        catch (err) {
            this.logger.warn(`Could not fetch music from bucket: ${err}`);
            return null;
        }
    }
};
exports.VideoRenderingService = VideoRenderingService;
exports.VideoRenderingService = VideoRenderingService = VideoRenderingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [shotstack_service_1.ShotstackService,
        supabase_service_1.SupabaseService,
        jobs_service_1.JobsService,
        config_1.ConfigService])
], VideoRenderingService);
//# sourceMappingURL=video-rendering.service.js.map