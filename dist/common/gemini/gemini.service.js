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
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const genai_1 = require("@google/genai");
let GeminiService = GeminiService_1 = class GeminiService {
    configService;
    ai;
    logger = new common_1.Logger(GeminiService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        const apiKey = this.configService.get('GEMINI_API_KEY');
        this.ai = new genai_1.GoogleGenAI({ apiKey });
        this.logger.log('Gemini client initialized');
    }
    async generateImageFromImage(imageBuffer, mimeType, prompt, aspectRatio = '9:16') {
        const base64Image = imageBuffer.toString('base64');
        const contents = [
            {
                inlineData: {
                    mimeType,
                    data: base64Image,
                },
            },
            { text: prompt },
        ];
        const maxRetries = 2;
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const waitMs = 3000 * attempt;
                    this.logger.warn(`Retry attempt ${attempt} for image generation (waiting ${waitMs}ms)`);
                    await this.delay(waitMs);
                }
                const response = await this.ai.models.generateContent({
                    model: 'gemini-3.1-flash-image-preview',
                    contents,
                });
                const parts = response.candidates?.[0]?.content?.parts;
                if (!parts) {
                    throw new Error('No content parts in Gemini response');
                }
                for (const part of parts) {
                    if (part.inlineData?.data) {
                        const buffer = Buffer.from(part.inlineData.data, 'base64');
                        this.logger.log(`Image generated successfully (${(buffer.length / 1024).toFixed(0)}KB)`);
                        return buffer;
                    }
                }
                throw new Error('No image data found in Gemini response');
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.logger.error(`Image generation failed (attempt ${attempt + 1}): ${lastError.message}`);
            }
        }
        throw lastError ?? new Error('Image generation failed');
    }
    async generateVideoFromImage(imageUrl, prompt, durationSeconds = 8, aspectRatio = '9:16') {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const base64Image = imageBuffer.toString('base64');
        const mimeType = imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')
            ? 'image/jpeg'
            : 'image/png';
        this.logger.log(`Veo 3.1: Generating ${durationSeconds}s video (${aspectRatio}) from image (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
        const maxRetries = 1;
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    this.logger.warn(`Retry attempt ${attempt} for video generation`);
                    await this.delay(5000 * attempt);
                }
                let operation = await this.ai.models.generateVideos({
                    model: 'veo-3.1-generate-preview',
                    prompt,
                    image: {
                        imageBytes: base64Image,
                        mimeType,
                    },
                    config: {
                        aspectRatio,
                        durationSeconds,
                        numberOfVideos: 1,
                    },
                });
                const maxWaitMs = 10 * 60 * 1000;
                const startTime = Date.now();
                let pollInterval = 5000;
                while (!operation.done) {
                    if (Date.now() - startTime > maxWaitMs) {
                        throw new Error('Veo video generation timed out after 10 minutes');
                    }
                    await this.delay(pollInterval);
                    operation = await this.ai.operations.getVideosOperation({
                        operation,
                    });
                    pollInterval = Math.min(pollInterval * 1.5, 15000);
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                    this.logger.log(`Veo polling... elapsed=${elapsed}s, done=${operation.done}`);
                }
                const response = operation.response;
                this.logger.log(`Veo response keys: ${JSON.stringify(Object.keys(response || {}))}`);
                const generatedVideo = response?.generatedVideos?.[0];
                if (!generatedVideo) {
                    this.logger.error(`Veo full response: ${JSON.stringify(response, null, 2).substring(0, 2000)}`);
                    throw new Error('Veo operation completed but no generated video found');
                }
                this.logger.log(`Generated video keys: ${JSON.stringify(Object.keys(generatedVideo || {}))}`);
                if (generatedVideo.video?.videoBytes) {
                    const videoBuffer = Buffer.from(generatedVideo.video.videoBytes, 'base64');
                    this.logger.log(`Video generated successfully via bytes (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
                    return videoBuffer;
                }
                const videoUri = generatedVideo.video?.uri || generatedVideo.uri;
                if (videoUri) {
                    this.logger.log(`Video available at URI: ${videoUri}, downloading...`);
                    const apiKey = this.configService.get('GEMINI_API_KEY');
                    let downloadUrl = videoUri;
                    if (downloadUrl.includes('generativelanguage.googleapis.com')) {
                        const separator = downloadUrl.includes('?') ? '&' : '?';
                        downloadUrl = `${downloadUrl}${separator}key=${apiKey}`;
                    }
                    const videoResponse = await fetch(downloadUrl, {
                        headers: {
                            'x-goog-api-key': apiKey,
                        },
                    });
                    if (!videoResponse.ok) {
                        const errorBody = await videoResponse.text();
                        this.logger.error(`Download failed (${videoResponse.status}): ${errorBody.substring(0, 500)}`);
                        throw new Error(`Failed to download video from URI: ${videoResponse.status} ${videoResponse.statusText}`);
                    }
                    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
                    this.logger.log(`Video downloaded successfully (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
                    return videoBuffer;
                }
                this.logger.error(`Veo generatedVideo structure: ${JSON.stringify(generatedVideo, null, 2).substring(0, 2000)}`);
                throw new Error('Veo operation completed but no video bytes or URI found');
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.logger.error(`Video generation failed (attempt ${attempt + 1}): ${lastError.message}`);
            }
        }
        throw lastError ?? new Error('Video generation failed');
    }
    async generateVideosFromImagesParallel(tasks) {
        this.logger.log(`Starting ${tasks.length} Veo video generations in parallel...`);
        const results = await Promise.all(tasks.map((t) => this.generateVideoFromImage(t.imageUrl, t.prompt, t.durationSeconds)));
        this.logger.log(`All ${tasks.length} videos generated successfully`);
        return results;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map