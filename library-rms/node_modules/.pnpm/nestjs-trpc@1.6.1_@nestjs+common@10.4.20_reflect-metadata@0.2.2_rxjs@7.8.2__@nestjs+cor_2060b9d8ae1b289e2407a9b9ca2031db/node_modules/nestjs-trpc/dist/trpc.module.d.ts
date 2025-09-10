import { DynamicModule, OnModuleInit } from '@nestjs/common/interfaces';
import { TRPCModuleOptions } from './interfaces';
export declare class TRPCModule implements OnModuleInit {
    private readonly options;
    private readonly consoleLogger;
    private readonly httpAdapterHost;
    private readonly trpcDriver;
    private readonly appRouterHost;
    static forRoot(options?: TRPCModuleOptions): DynamicModule;
    onModuleInit(): Promise<void>;
}
//# sourceMappingURL=trpc.module.d.ts.map