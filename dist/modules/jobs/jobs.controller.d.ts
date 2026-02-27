import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    create(dto: CreateJobDto): Promise<{
        id: string;
        status: string;
    }>;
    findById(id: string): Promise<import("./jobs.service").VideoJob>;
    getStatus(id: string): Promise<{
        id: string;
        status: string;
    }>;
    skipImages(id: string): Promise<{
        error: string;
        id?: undefined;
        premium_image_url?: undefined;
        model_image_url?: undefined;
    } | {
        id: string;
        premium_image_url: string | null;
        model_image_url: string | null;
        error?: undefined;
    }>;
}
