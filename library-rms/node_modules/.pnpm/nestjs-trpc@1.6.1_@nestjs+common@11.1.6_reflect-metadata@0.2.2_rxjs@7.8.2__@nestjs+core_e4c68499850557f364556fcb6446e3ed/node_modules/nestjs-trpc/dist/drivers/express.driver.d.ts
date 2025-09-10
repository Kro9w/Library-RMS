import type { Application as ExpressApplication } from 'express';
import { TRPCContext, TRPCModuleOptions } from '../interfaces';
import type { AnyRouter } from '@trpc/server';
export declare class ExpressDriver<TOptions extends Record<string, any> = TRPCModuleOptions> {
    start(options: TRPCModuleOptions, app: ExpressApplication, appRouter: AnyRouter, contextInstance: TRPCContext | null): Promise<void>;
}
//# sourceMappingURL=express.driver.d.ts.map