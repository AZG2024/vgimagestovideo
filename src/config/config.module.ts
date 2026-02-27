import { ConfigModule } from '@nestjs/config';
import { validate } from './env.validation';

export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validate,
});
