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
var ImageGenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const gemini_service_1 = require("../../common/gemini/gemini.service");
const supabase_service_1 = require("../../common/supabase/supabase.service");
const jobs_service_1 = require("../jobs/jobs.service");
const necklace_prompts_1 = require("./prompts/necklace.prompts");
const PROMPTS_BY_CATEGORY = {
    necklace: {
        '9:16': {
            premium: necklace_prompts_1.NECKLACE_PREMIUM_PROMPT,
            model: necklace_prompts_1.NECKLACE_MODEL_PROMPT,
        },
        '1:1': {
            premium: necklace_prompts_1.NECKLACE_PREMIUM_PROMPT_SQUARE,
            model: necklace_prompts_1.NECKLACE_MODEL_PROMPT_SQUARE,
        },
    },
};
let ImageGenerationService = ImageGenerationService_1 = class ImageGenerationService {
    geminiService;
    supabaseService;
    jobsService;
    configService;
    logger = new common_1.Logger(ImageGenerationService_1.name);
    constructor(geminiService, supabaseService, jobsService, configService) {
        this.geminiService = geminiService;
        this.supabaseService = supabaseService;
        this.jobsService = jobsService;
        this.configService = configService;
    }
    async generateImages(jobId, aspectRatio = '9:16') {
        const startTime = Date.now();
        const job = await this.jobsService.findById(jobId);
        if (!job.original_image_url) {
            throw new Error(`Job ${jobId} has no original image`);
        }
        const categoryPrompts = PROMPTS_BY_CATEGORY[job.product_category];
        if (!categoryPrompts) {
            throw new Error(`No prompts configured for category: ${job.product_category}`);
        }
        const prompts = categoryPrompts[aspectRatio] || categoryPrompts['9:16'];
        this.logger.log(`Job ${jobId}: Using ${aspectRatio} prompts for ${job.product_category}`);
        await this.jobsService.updateStatus(jobId, 'PROCESSING_IMAGES');
        try {
            const originalImage = await this.downloadImage(job.original_image_url);
            this.logger.log(`Job ${jobId}: Generating premium image (${aspectRatio})...`);
            const premiumBuffer = await this.geminiService.generateImageFromImage(originalImage.buffer, originalImage.mimeType, prompts.premium, aspectRatio === '1:1' ? '1:1' : '9:16');
            this.logger.log(`Job ${jobId}: Generating model image (${aspectRatio})...`);
            const modelBuffer = await this.geminiService.generateImageFromImage(originalImage.buffer, originalImage.mimeType, prompts.model, aspectRatio === '1:1' ? '1:1' : '9:16');
            const bucket = this.configService.get('STORAGE_BUCKET');
            const premiumImageUrl = await this.uploadImage(bucket, `${jobId}/premium.png`, premiumBuffer);
            const modelImageUrl = await this.uploadImage(bucket, `${jobId}/model.png`, modelBuffer);
            await this.jobsService.updateStatus(jobId, 'PENDING', {
                premium_image_url: premiumImageUrl,
                model_image_url: modelImageUrl,
            });
            const durationMs = Date.now() - startTime;
            await this.jobsService.updateStepTiming(jobId, 'image_generation', durationMs);
            this.logger.log(`Job ${jobId}: Image generation complete in ${durationMs}ms`);
            return { premiumImageUrl, modelImageUrl };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.jobsService.updateStatus(jobId, 'FAILED', {
                error_message: `Image generation failed: ${message}`,
            });
            throw error;
        }
    }
    async downloadImage(imageUrl) {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const mimeType = response.headers.get('content-type') || 'image/png';
        return {
            buffer: Buffer.from(arrayBuffer),
            mimeType,
        };
    }
    async uploadImage(bucket, path, buffer) {
        const { error } = await this.supabaseService
            .getClient()
            .storage.from(bucket)
            .upload(path, buffer, {
            contentType: 'image/png',
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
};
exports.ImageGenerationService = ImageGenerationService;
exports.ImageGenerationService = ImageGenerationService = ImageGenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService,
        supabase_service_1.SupabaseService,
        jobs_service_1.JobsService,
        config_1.ConfigService])
], ImageGenerationService);
//# sourceMappingURL=image-generation.service.js.map