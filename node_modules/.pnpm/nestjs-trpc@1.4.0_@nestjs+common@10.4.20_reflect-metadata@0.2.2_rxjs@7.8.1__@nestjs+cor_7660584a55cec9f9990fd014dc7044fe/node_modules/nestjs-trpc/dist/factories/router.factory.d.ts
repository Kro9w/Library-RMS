import { RouterInstance, TRPCPublicProcedure, TRPCRouter } from '../interfaces/factory.interface';
export declare class RouterFactory {
    private readonly consoleLogger;
    private readonly modulesContainer;
    private readonly procedureFactory;
    getRouters(): Array<RouterInstance>;
    private extractRouterFromWrapper;
    serializeRoutes(router: TRPCRouter, procedure: TRPCPublicProcedure): Record<string, any>;
}
//# sourceMappingURL=router.factory.d.ts.map