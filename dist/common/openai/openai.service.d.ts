import { ConfigService } from '@nestjs/config';
export declare class OpenaiService {
    private readonly configService;
    private readonly logger;
    private readonly client;
    constructor(configService: ConfigService);
    generateProductDescription(category: string, stoneName: string): Promise<string>;
}
