import { Module } from '@nestjs/common';
import { ThekedaarsController } from './thekedaars.controller';
import { ThekedaarsService } from './thekedaars.service';

@Module({
  controllers: [ThekedaarsController],
  providers: [ThekedaarsService],
  exports: [ThekedaarsService],
})
export class ThekedaarsModule {}
