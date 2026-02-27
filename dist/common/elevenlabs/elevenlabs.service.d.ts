import { ConfigService } from '@nestjs/config';
export declare class ElevenLabsService {
    private readonly configService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService);
    textToSpeech(text: string, voiceId?: string): Promise<Buffer>;
}
