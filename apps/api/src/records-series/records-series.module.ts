import { Module } from '@nestjs/common';
import { RecordsSeriesRouter } from './records-series.router';
import { PrismaModule } from '../prisma/prisma.module';
import { LogModule } from '../log/log.module';

@Module({
  imports: [PrismaModule, LogModule],
  providers: [RecordsSeriesRouter],
  exports: [RecordsSeriesRouter],
})
export class RecordsSeriesModule {}
