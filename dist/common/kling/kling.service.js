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
var KlingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KlingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt = __importStar(require("jsonwebtoken"));
let KlingService = KlingService_1 = class KlingService {
    configService;
    accessKey;
    secretKey;
    baseUrl = 'https://api.klingai.com';
    logger = new common_1.Logger(KlingService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        this.accessKey = this.configService.get('KLING_API_KEY');
        this.secretKey = this.configService.get('KLING_SECRET_KEY');
        this.logger.log('Kling service initialized');
    }
    generateToken() {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: this.accessKey,
            iat: now - 5,
            nbf: now - 5,
            exp: now + 30 * 60,
        };
        return jwt.sign(payload, this.secretKey, {
            algorithm: 'HS256',
            header: { alg: 'HS256', typ: 'JWT' },
        });
    }
    async createImageToVideoTask(imageUrl, prompt, duration = '10', aspectRatio = '9:16', model = 'kling-v2-master') {
        const token = this.generateToken();
        const body = {
            model_name: model,
            image: imageUrl,
            prompt,
            duration,
            aspect_ratio: aspectRatio,
            mode: 'std',
        };
        this.logger.log(`Creating I2V task: model=${model}, duration=${duration}s, ratio=${aspectRatio}`);
        const response = await fetch(`${this.baseUrl}/v1/videos/image2video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = (await response.json());
        if (data.code !== 0) {
            throw new Error(`Kling create task failed: ${data.message} (code: ${data.code})`);
        }
        this.logger.log(`Task created: ${data.data.task_id}`);
        return data.data.task_id;
    }
    async pollTaskUntilDone(taskId, maxWaitMs = 10 * 60 * 1000) {
        const startTime = Date.now();
        let pollInterval = 5000;
        while (Date.now() - startTime < maxWaitMs) {
            const token = this.generateToken();
            const response = await fetch(`${this.baseUrl}/v1/videos/image2video/${taskId}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = (await response.json());
            if (data.code !== 0) {
                throw new Error(`Kling poll failed: ${data.message}`);
            }
            const status = data.data.task_status;
            this.logger.log(`Task ${taskId} status: ${status}`);
            if (status === 'succeed') {
                const videoUrl = data.data.task_result?.videos?.[0]?.url;
                if (!videoUrl) {
                    throw new Error('Task succeeded but no video URL found');
                }
                return videoUrl;
            }
            if (status === 'failed') {
                throw new Error(`Task failed: ${data.data.task_status_msg || 'Unknown error'}`);
            }
            await this.delay(pollInterval);
            pollInterval = Math.min(pollInterval * 1.5, 15000);
        }
        throw new Error(`Task ${taskId} timed out after ${maxWaitMs / 1000}s`);
    }
    async generateVideo(imageUrl, prompt, duration = '10', aspectRatio = '9:16') {
        const taskId = await this.createImageToVideoTask(imageUrl, prompt, duration, aspectRatio);
        return this.pollTaskUntilDone(taskId);
    }
    async generateVideosParallel(tasks, maxWaitMs = 10 * 60 * 1000) {
        this.logger.log(`Creating ${tasks.length} video tasks in parallel...`);
        const taskIds = await Promise.all(tasks.map((t) => this.createImageToVideoTask(t.imageUrl, t.prompt, t.duration, t.aspectRatio)));
        this.logger.log(`All tasks created: ${taskIds.join(', ')}`);
        const startTime = Date.now();
        let pollInterval = 5000;
        const results = new Array(taskIds.length).fill(null);
        while (Date.now() - startTime < maxWaitMs) {
            const pending = taskIds.filter((_, i) => results[i] === null);
            if (pending.length === 0)
                break;
            const token = this.generateToken();
            for (let i = 0; i < taskIds.length; i++) {
                if (results[i] !== null)
                    continue;
                const response = await fetch(`${this.baseUrl}/v1/videos/image2video/${taskIds[i]}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
                const data = (await response.json());
                if (data.code !== 0) {
                    throw new Error(`Kling poll failed for task ${taskIds[i]}: ${data.message}`);
                }
                const status = data.data.task_status;
                this.logger.log(`Task ${taskIds[i]} status: ${status}`);
                if (status === 'succeed') {
                    const videoUrl = data.data.task_result?.videos?.[0]?.url;
                    if (!videoUrl)
                        throw new Error(`Task ${taskIds[i]} succeeded but no video URL`);
                    results[i] = videoUrl;
                    this.logger.log(`Task ${taskIds[i]} completed!`);
                }
                else if (status === 'failed') {
                    throw new Error(`Task ${taskIds[i]} failed: ${data.data.task_status_msg || 'Unknown error'}`);
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
exports.KlingService = KlingService;
exports.KlingService = KlingService = KlingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KlingService);
//# sourceMappingURL=kling.service.js.map