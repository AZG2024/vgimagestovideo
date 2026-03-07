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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OpenaiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenaiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
let OpenaiService = OpenaiService_1 = class OpenaiService {
    configService;
    logger = new common_1.Logger(OpenaiService_1.name);
    client;
    constructor(configService) {
        this.configService = configService;
        this.client = new openai_1.default({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
    }
    async generateProductDescription(category, stoneName) {
        const productType = category === 'necklace'
            ? 'necklace'
            : category === 'bracelet'
                ? 'bracelet'
                : 'home decoration piece';
        const prompt = `You are a luxury crystal jewelry copywriter.

Write one single sentence (28–30 words) describing the spiritual and emotional benefits of ${stoneName}.

CRITICAL: You MUST use the exact stone name "${stoneName}" in your sentence. Do NOT replace it with a different stone name or synonym.

Style rules:
- Elegant and refined tone
- Start with: "${stoneName} is known as..."
- No emojis
- No hashtags
- No exaggerated medical claims
- Keep it mystical but sophisticated
- One sentence only`;
        this.logger.log(`Generating description for ${category} with ${stoneName}...`);
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 60,
            temperature: 0.8,
        });
        const description = response.choices[0]?.message?.content?.trim();
        if (!description) {
            throw new Error('OpenAI returned empty description');
        }
        this.logger.log(`Description generated (${description.split(' ').length} words): ${description.substring(0, 80)}...`);
        return description;
    }
};
exports.OpenaiService = OpenaiService;
exports.OpenaiService = OpenaiService = OpenaiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenaiService);
//# sourceMappingURL=openai.service.js.map