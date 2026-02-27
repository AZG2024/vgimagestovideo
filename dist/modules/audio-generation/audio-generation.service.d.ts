import { ConfigService } from '@nestjs/config';
import { OpenaiService } from '../../common/openai/openai.service';
import { ElevenLabsService } from '../../common/elevenlabs/elevenlabs.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { JobsService } from '../jobs/jobs.service';
export declare class AudioGenerationService {
    private readonly openaiService;
    private readonly elevenLabsService;
    private readonly supabaseService;
    private readonly jobsService;
    private readonly configService;
    private readonly logger;
    constructor(openaiService: OpenaiService, elevenLabsService: ElevenLabsService, supabaseService: SupabaseService, jobsService: JobsService, configService: ConfigService);
    generateAudio(jobId: string): Promise<void>;
}
