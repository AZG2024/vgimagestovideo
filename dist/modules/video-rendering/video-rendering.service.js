"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VideoRenderingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoRenderingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ffmpeg_service_1 = require("../../common/ffmpeg/ffmpeg.service");
const supabase_service_1 = require("../../common/supabase/supabase.service");
const jobs_service_1 = require("../jobs/jobs.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
let VideoRenderingService = VideoRenderingService_1 = class VideoRenderingService {
    ffmpegService;
    supabaseService;
    jobsService;
    configService;
    logger = new common_1.Logger(VideoRenderingService_1.name);
    constructor(ffmpegService, supabaseService, jobsService, configService) {
        this.ffmpegService = ffmpegService;
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
        const tmpDir = path.join(os.tmpdir(), `video-render-${jobId}`);
        try {
            fs.mkdirSync(tmpDir, { recursive: true });
            const video1Path = path.join(tmpDir, 'video1.mp4');
            const video2Path = path.join(tmpDir, 'video2.mp4');
            const voiceoverPath = path.join(tmpDir, 'voiceover.mp3');
            const bgMusicPath = path.join(tmpDir, 'bgmusic.mp3');
            const outputPath = path.join(tmpDir, 'final.mp4');
            this.logger.log(`Job ${jobId}: Downloading assets for rendering...`);
            const downloads = [
                this.downloadFile(job.video1_url, video1Path),
                this.downloadFile(job.video2_url, video2Path),
            ];
            let hasVoiceover = false;
            let hasBgMusic = false;
            if (job.audio_url) {
                downloads.push(this.downloadFile(job.audio_url, voiceoverPath));
                hasVoiceover = true;
            }
            const bgMusicUrl = await this.getRandomMusicUrl();
            if (bgMusicUrl) {
                downloads.push(this.downloadFile(bgMusicUrl, bgMusicPath));
                hasBgMusic = true;
                this.logger.log(`Job ${jobId}: Selected background music: ${bgMusicUrl}`);
            }
            await Promise.all(downloads);
            this.logger.log(`Job ${jobId}: Starting FFmpeg rendering (voice: ${hasVoiceover}, music: ${hasBgMusic})...`);
            await this.ffmpegService.renderFinalVideo(video1Path, video2Path, video2Path, outputPath, hasVoiceover ? voiceoverPath : undefined, hasBgMusic ? bgMusicPath : undefined, 1, 5, 8);
            this.logger.log(`Job ${jobId}: Uploading final video...`);
            const bucket = this.configService.get('STORAGE_BUCKET');
            const finalBuffer = fs.readFileSync(outputPath);
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
        finally {
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
                this.logger.log(`Cleaned up temp dir: ${tmpDir}`);
            }
            catch {
                this.logger.warn(`Could not clean up temp dir: ${tmpDir}`);
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
    async downloadFile(url, destPath) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download ${url}: ${response.statusText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(destPath, buffer);
        this.logger.log(`Downloaded ${path.basename(destPath)} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    }
};
exports.VideoRenderingService = VideoRenderingService;
exports.VideoRenderingService = VideoRenderingService = VideoRenderingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ffmpeg_service_1.FfmpegService,
        supabase_service_1.SupabaseService,
        jobs_service_1.JobsService,
        config_1.ConfigService])
], VideoRenderingService);
//# sourceMappingURL=video-rendering.service.js.map