import { Global, Module } from '@nestjs/common';
import { WaveSpeedService } from './wavespeed.service';

@Global()
@Module({
  providers: [WaveSpeedService],
  exports: [WaveSpeedService],
})
export class WaveSpeedModule {}
