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
            { text: prompt },
            {
                inlineData: {
                    mimeType,
                    data: base64Image,
                },
            },
        ];
        const maxRetries = 1;
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    this.logger.warn(`Retry attempt ${attempt} for image generation`);
                    await this.delay(2000 * attempt);
                }
                const response = await this.ai.models.generateContent({
                    model: 'gemini-3.1-flash-image-preview',
                    contents,
                    config: {
                        responseModalities: ['TEXT', 'IMAGE'],
                        imageConfig: {
                            aspectRatio,
                        },
                    },
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