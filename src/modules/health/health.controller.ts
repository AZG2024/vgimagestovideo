import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          const { error } = await this.supabaseService
            .getClient()
            .from('video_jobs')
            .select('id')
            .limit(1);

          if (error) throw error;

          return { supabase: { status: 'up' } };
        } catch {
          return { supabase: { status: 'down' } };
        }
      },
    ]);
  }
}
