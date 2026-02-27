import { HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { SupabaseService } from '../../common/supabase/supabase.service';
export declare class HealthController {
    private readonly health;
    private readonly supabaseService;
    constructor(health: HealthCheckService, supabaseService: SupabaseService);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult<HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & HealthIndicatorResult, Partial<HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & HealthIndicatorResult> | undefined, Partial<HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & HealthIndicatorResult> | undefined>>;
}
