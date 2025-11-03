import { Module } from '@nestjs/common';
import { LogRouter } from './log.router';

@Module({
  providers: [LogRouter],
  exports: [LogRouter],
})
export class LogModule {}
