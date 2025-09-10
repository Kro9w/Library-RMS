import { ModuleRef } from '@nestjs/core';
import { ProcedureFactoryMetadata, TRPCPublicProcedure } from '../interfaces/factory.interface';
import { TRPCMiddleware } from '../interfaces';
import type { Class, Constructor } from 'type-fest';
export declare class ProcedureFactory {
    private moduleRef;
    private readonly consoleLogger;
    private readonly metadataScanner;
    constructor(moduleRef: ModuleRef);
    getProcedures(instance: any, prototype: Record<string, (...args: Array<unknown>) => unknown>): Array<ProcedureFactoryMetadata>;
    private extractProcedureParams;
    private extractProcedureMetadata;
    serializeProcedures(procedures: Array<ProcedureFactoryMetadata>, instance: any, camelCasedRouterName: string, procedureBuilder: TRPCPublicProcedure, routerMiddlewares: Array<Constructor<TRPCMiddleware> | Class<TRPCMiddleware>>): Record<string, any>;
    private createProcedureInstance;
    private serializeProcedureParams;
    private createSerializedProcedure;
}
//# sourceMappingURL=procedure.factory.d.ts.map