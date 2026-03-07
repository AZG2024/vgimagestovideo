import { Global, Module } from '@nestjs/common';
import { ShotstackService } from './shotstack.service';

@Global()
@Module({
  providers: [ShotstackService],
  exports: [ShotstackService],
})
export class ShotstackModule {}
