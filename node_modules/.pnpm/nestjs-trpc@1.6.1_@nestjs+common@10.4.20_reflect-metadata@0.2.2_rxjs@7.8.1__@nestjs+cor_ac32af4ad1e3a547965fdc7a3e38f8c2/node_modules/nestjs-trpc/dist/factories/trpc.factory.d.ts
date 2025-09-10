import { MergeRouters } from '@trpc/server/dist/core/internals/mergeRouters';
import { AnyRouterDef } from '@trpc/server/dist/core/router';
import { TRPCRouter } from '../interfaces/factory.interface';
import { AnyRouter, ProcedureBuilder } from '@trpc/server';
export declare class TRPCFactory {
    private readonly routerFactory;
    serializeAppRoutes(router: TRPCRouter, procedure: ProcedureBuilder<any>): MergeRouters<Array<AnyRouter>, AnyRouterDef>;
}
//# sourceMappingURL=trpc.factory.d.ts.map