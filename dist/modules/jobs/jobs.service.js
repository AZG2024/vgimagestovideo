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
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../common/supabase/supabase.service");
let JobsService = JobsService_1 = class JobsService {
    supabaseService;
    logger = new common_1.Logger(JobsService_1.name);
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async create(dto) {
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
        return data;
    }
    async findById(id) {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('video_jobs')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(`Job ${id} not found`);
        }
        return data;
    }
    async updateStatus(id, status, extras) {
        const updateData = { status, ...extras };
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
        return data;
    }
    async updateStepTiming(id, step, durationMs) {
        const job = await this.findById(id);
        const timings = { ...job.step_timings, [step]: durationMs };
        await this.supabaseService
            .getClient()
            .from('video_jobs')
            .update({ step_timings: timings })
            .eq('id', id);
        this.logger.log(`Job ${id} step timing: ${step} = ${durationMs}ms`);
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map