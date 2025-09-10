import type { FastifyInstance as FastifyApplication } from 'fastify';
import { TRPCContext, TRPCModuleOptions } from '../interfaces';
import type { AnyRouter } from '@trpc/server';
export declare class FastifyDriver<TOptions extends Record<string, any> = TRPCModuleOptions> {
    start(options: TRPCModuleOptions, app: FastifyApplication, appRouter: AnyRouter, contextInstance: TRPCContext | null): Promise<void>;
}
//# sourceMappingURL=fastify.driver.d.ts.map