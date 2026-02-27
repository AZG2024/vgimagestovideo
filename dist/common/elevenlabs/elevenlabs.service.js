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
var ElevenLabsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevenLabsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ElevenLabsService = ElevenLabsService_1 = class ElevenLabsService {
    configService;
    logger = new common_1.Logger(ElevenLabsService_1.name);
    apiKey;
    baseUrl = 'https://api.elevenlabs.io/v1';
    constructor(configService) {
        this.configService = configService;
        this.apiKey = this.configService.get('ELEVEN_LABS_API_KEY');
    }
    async textToSpeech(text, voiceId = '21m00Tcm4TlvDq8ikWAM') {
        this.logger.log(`Generating TTS audio (${text.split(' ').length} words, voice: ${voiceId})...`);
        const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.6,
                    similarity_boost: 0.75,
                    style: 0.3,
                    speed: 0.75,
                },
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        this.logger.log(`TTS audio generated: ${(buffer.length / 1024).toFixed(1)}KB`);
        return buffer;
    }
};
exports.ElevenLabsService = ElevenLabsService;
exports.ElevenLabsService = ElevenLabsService = ElevenLabsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ElevenLabsService);
//# sourceMappingURL=elevenlabs.service.js.map