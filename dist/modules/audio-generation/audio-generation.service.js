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
var AudioGenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioGenerationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_service_1 = require("../../common/openai/openai.service");
const elevenlabs_service_1 = require("../../common/elevenlabs/elevenlabs.service");
const supabase_service_1 = require("../../common/supabase/supabase.service");
const jobs_service_1 = require("../jobs/jobs.service");
let AudioGenerationService = AudioGenerationService_1 = class AudioGenerationService {
    openaiService;
    elevenLabsService;
    supabaseService;
    jobsService;
    configService;
    logger = new common_1.Logger(AudioGenerationService_1.name);
    constructor(openaiService, elevenLabsService, supabaseService, jobsService, configService) {
        this.openaiService = openaiService;
        this.elevenLabsService = elevenLabsService;
        this.supabaseService = supabaseService;
        this.jobsService = jobsService;
        this.configService = configService;
    }
    async generateAudio(jobId) {
        const startTime = Date.now();
        const job = await this.jobsService.findById(jobId);
        if (!job.product_category) {
            throw new Error(`Job ${jobId} is missing product_category.`);
        }
        const stoneName = job.stone_name || 'natural gemstone';
        await this.jobsService.updateStatus(jobId, 'PROCESSING_AUDIO');
        try {
            this.logger.log(`Job ${jobId}: Generating product description...`);
            const description = await this.openaiService.generateProductDescription(job.product_category, stoneName);
            await this.jobsService.updateStatus(jobId, 'PROCESSING_AUDIO', {
                description_text: description,
            });
            this.logger.log(`Job ${jobId}: Description: "${description}"`);
            this.logger.log(`Job ${jobId}: Generating TTS audio...`);
            const audioBuffer = await this.elevenLabsService.textToSpeech(description);
            this.logger.log(`Job ${jobId}: Uploading audio...`);
            const bucket = this.configService.get('STORAGE_BUCKET');
            const { error } = await this.supabaseService
                .getClient()
                .storage.from(bucket)
                .upload(`${jobId}/audio.mp3`, audioBuffer, {
                contentType: 'audio/mpeg',
                upsert: true,
            });
            if (error) {
                throw new Error(`Failed to upload audio: ${error.message}`);
            }
            const { data } = this.supabaseService
                .getClient()
                .storage.from(bucket)
                .getPublicUrl(`${jobId}/audio.mp3`);
            await this.jobsService.updateStatus(jobId, 'PENDING', {
                audio_url: data.publicUrl,
            });
            const durationMs = Date.now() - startTime;
            await this.jobsService.updateStepTiming(jobId, 'audio_generation', durationMs);
            this.logger.log(`Job ${jobId}: Audio generation complete in ${durationMs}ms. URL: ${data.publicUrl}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Job ${jobId}: Audio generation failed: ${message}`);
            try {
                await this.jobsService.updateStatus(jobId, 'FAILED', {
                    error_message: `Audio generation failed: ${message}`,
                });
            }
            catch (updateError) {
                this.logger.error(`Could not update job ${jobId} to FAILED: ${updateError}`);
            }
        }
    }
};
exports.AudioGenerationService = AudioGenerationService;
exports.AudioGenerationService = AudioGenerationService = AudioGenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenaiService,
        elevenlabs_service_1.ElevenLabsService,
        supabase_service_1.SupabaseService,
        jobs_service_1.JobsService,
        config_1.ConfigService])
], AudioGenerationService);
//# sourceMappingURL=audio-generation.service.js.map