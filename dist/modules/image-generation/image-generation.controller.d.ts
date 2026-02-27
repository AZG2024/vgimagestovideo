import { ImageGenerationService } from './image-generation.service';
export declare class ImageGenerationController {
    private readonly imageGenerationService;
    constructor(imageGenerationService: ImageGenerationService);
    generateImages(id: string): Promise<{
        premiumImageUrl: string;
        modelImageUrl: string;
    }>;
}
