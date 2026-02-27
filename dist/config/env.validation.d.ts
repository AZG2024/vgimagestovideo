declare class EnvironmentVariables {
    PORT: number;
    NODE_ENV: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_KEY: string;
    STORAGE_BUCKET: string;
    GEMINI_API_KEY: string;
    WAVESPEED_API_KEY: string;
    OPENAI_API_KEY: string;
    ELEVEN_LABS_API_KEY: string;
}
export declare function validate(config: Record<string, unknown>): EnvironmentVariables;
export {};
