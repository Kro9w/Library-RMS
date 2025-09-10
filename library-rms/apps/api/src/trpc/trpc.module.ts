import { Module } from '@nestjs/common';
import { TRPCModule } from 'nestjs-trpc';

@Module({
  imports: [TRPCModule],
  providers: [], // router instance doesn't need to be provided
})
export class AppTrpcModule {}