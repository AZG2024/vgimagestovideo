import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsString()
  @IsNotEmpty()
  SUPABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_KEY: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_BUCKET: string;

  @IsString()
  @IsNotEmpty()
  GEMINI_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  WAVESPEED_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  OPENAI_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  ELEVEN_LABS_API_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.toString()}`);
  }

  return validatedConfig;
}
