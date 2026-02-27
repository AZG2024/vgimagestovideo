import { UploadService } from './upload.service';
import { UploadDto } from './dto/upload.dto';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    upload(file: Express.Multer.File, dto: UploadDto): Promise<{
        jobId: string;
        originalImageUrl: string;
    }>;
}
