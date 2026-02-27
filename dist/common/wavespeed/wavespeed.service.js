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
var WaveSpeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaveSpeedService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let WaveSpeedService = WaveSpeedService_1 = class WaveSpeedService {
    configService;
    apiKey;
    baseUrl = 'https://api.wavespeed.ai/api/v3';
    logger = new common_1.Logger(WaveSpeedService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        this.apiKey = this.configService.get('WAVESPEED_API_KEY');
        this.logger.log('WaveSpeed service initialized');
    }
    async createImageToVideoTask(imageUrl, prompt, duration = 5) {
        const body = {
            image: imageUrl,
            prompt,
            duration,
        };
        this.logger.log(`Creating I2V task: duration=${duration}s`);
        const response = await fetch(`${this.baseUrl}/kwaivgi/kling-video-o3-pro/image-to-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        const data = (await response.json());
        if (data.code !== 200) {
            throw new Error(`WaveSpeed create task failed: ${data.message} (code: ${data.code})`);
        }
        this.logger.log(`Task created: ${data.data.id}`);
        return data.data.id;
    }
    async pollTaskUntilDone(taskId, maxWaitMs = 10 * 60 * 1000) {
        const startTime = Date.now();
        let pollInterval = 5000;
        while (Date.now() - startTime < maxWaitMs) {
            const response = await fetch(`${this.baseUrl}/predictions/${taskId}/result`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${this.apiKey}` },
            });
            const data = (await response.json());
            if (data.code !== 200) {
                throw new Error(`WaveSpeed poll failed: ${data.message}`);
            }
            const status = data.data.status;
            this.logger.log(`Task ${taskId} status: ${status}`);
            if (status === 'completed') {
                const videoUrl = data.data.outputs?.[0];
                if (!videoUrl) {
                    throw new Error('Task completed but no video URL found');
                }
                return videoUrl;
            }
            if (status === 'failed') {
                throw new Error(`Task failed: ${data.data.error || 'Unknown error'}`);
            }
            await this.delay(pollInterval);
            pollInterval = Math.min(pollInterval * 1.5, 15000);
        }
        throw new Error(`Task ${taskId} timed out after ${maxWaitMs / 1000}s`);
    }
    async generateVideo(imageUrl, prompt, duration = 5) {
        const taskId = await this.createImageToVideoTask(imageUrl, prompt, duration);
        return this.pollTaskUntilDone(taskId);
    }
    async generateVideosParallel(tasks, maxWaitMs = 10 * 60 * 1000) {
        this.logger.log(`Creating ${tasks.length} video tasks in parallel...`);
        const taskIds = await Promise.all(tasks.map((t) => this.createImageToVideoTask(t.imageUrl, t.prompt, t.duration)));
        this.logger.log(`All tasks created: ${taskIds.join(', ')}`);
        const startTime = Date.now();
        let pollInterval = 5000;
        const results = new Array(taskIds.length).fill(null);
        while (Date.now() - startTime < maxWaitMs) {
            if (results.every((r) => r !== null))
                break;
            for (let i = 0; i < taskIds.length; i++) {
                if (results[i] !== null)
                    continue;
                const response = await fetch(`${this.baseUrl}/predictions/${taskIds[i]}/result`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${this.apiKey}` },
                });
                const data = (await response.json());
                if (data.code !== 200) {
                    throw new Error(`WaveSpeed poll failed for task ${taskIds[i]}: ${data.message}`);
                }
                const status = data.data.status;
                this.logger.log(`Task ${taskIds[i]} status: ${status}`);
                if (status === 'completed') {
                    const videoUrl = data.data.outputs?.[0];
                    if (!videoUrl)
                        throw new Error(`Task ${taskIds[i]} completed but no video URL`);
                    results[i] = videoUrl;
                    this.logger.log(`Task ${taskIds[i]} completed!`);
                }
                else if (status === 'failed') {
                    throw new Error(`Task ${taskIds[i]} failed: ${data.data.error || 'Unknown error'}`);
                }
            }
            if (results.every((r) => r !== null))
                break;
            await this.delay(pollInterval);
            pollInterval = Math.min(pollInterval * 1.5, 15000);
        }
        if (results.some((r) => r === null)) {
            throw new Error(`Some tasks timed out after ${maxWaitMs / 1000}s`);
        }
        return results;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.WaveSpeedService = WaveSpeedService;
exports.WaveSpeedService = WaveSpeedService = WaveSpeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WaveSpeedService);
//# sourceMappingURL=wavespeed.service.js.map