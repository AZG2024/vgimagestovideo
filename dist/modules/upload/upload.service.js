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
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_service_1 = require("../../common/supabase/supabase.service");
const jobs_service_1 = require("../jobs/jobs.service");
let UploadService = UploadService_1 = class UploadService {
    supabaseService;
    jobsService;
    configService;
    logger = new common_1.Logger(UploadService_1.name);
    constructor(supabaseService, jobsService, configService) {
        this.supabaseService = supabaseService;
        this.jobsService = jobsService;
        this.configService = configService;
    }
    async upload(file, dto) {
        const startTime = Date.now();
        const job = await this.jobsService.create({
            productCategory: dto.productCategory,
            stoneName: dto.stoneName,
        });
        await this.jobsService.updateStatus(job.id, 'UPLOADING');
        const ext = file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : file.mimetype.split('/')[1];
        const storagePath = `${job.id}/original.${ext}`;
        const bucket = this.configService.get('STORAGE_BUCKET');
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
            });
            throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        const { data: urlData } = this.supabaseService
            .getClient()
            .storage.from(bucket)
            .getPublicUrl(storagePath);
        const originalImageUrl = urlData.publicUrl;
        await this.jobsService.updateStatus(job.id, 'PENDING', {
            original_image_url: originalImageUrl,
        });
        const durationMs = Date.now() - startTime;
        await this.jobsService.updateStepTiming(job.id, 'upload', durationMs);
        this.logger.log(`Upload complete for job ${job.id} in ${durationMs}ms`);
        return { jobId: job.id, originalImageUrl };
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        jobs_service_1.JobsService,
        config_1.ConfigService])
], UploadService);
//# sourceMappingURL=upload.service.js.map