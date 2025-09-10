import { ConsoleLogger } from '@nestjs/common';
import { HttpAdapterHost, ModuleRef } from '@nestjs/core';
import { TRPCModuleOptions } from './interfaces';
import { TRPCFactory } from './factories/trpc.factory';
import { AppRouterHost } from './app-router.host';
import { ExpressDriver, FastifyDriver } from './drivers';
export declare class TRPCDriver<TOptions extends Record<string, any> = TRPCModuleOptions> {
    private moduleRef;
    protected readonly httpAdapterHost: HttpAdapterHost;
    protected readonly trpcFactory: TRPCFactory;
    protected readonly consoleLogger: ConsoleLogger;
    protected readonly appRouterHost: AppRouterHost;
    protected readonly expressDriver: ExpressDriver;
    protected readonly fastifyDriver: FastifyDriver;
    constructor(moduleRef: ModuleRef);
    start(options: TRPCModuleOptions): Promise<void>;
}
//# sourceMappingURL=trpc.driver.d.ts.map