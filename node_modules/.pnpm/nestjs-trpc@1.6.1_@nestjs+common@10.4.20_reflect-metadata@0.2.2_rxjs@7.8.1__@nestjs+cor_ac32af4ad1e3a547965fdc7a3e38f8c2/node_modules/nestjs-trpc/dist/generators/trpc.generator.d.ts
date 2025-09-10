import { OnModuleInit } from '@nestjs/common';
import { SchemaImports, TRPCContext } from '../interfaces';
import type { Class } from 'type-fest';
export declare class TRPCGenerator implements OnModuleInit {
    private rootModuleImportsMap;
    private readonly HELPER_TYPES_OUTPUT_FILE;
    private readonly HELPER_TYPES_OUTPUT_PATH;
    private readonly moduleCallerFilePath;
    private readonly project;
    private readonly appRouterSourceFile;
    private readonly consoleLogger;
    private readonly staticGenerator;
    private readonly middlewareHandler;
    private readonly contextHandler;
    private readonly serializerHandler;
    private readonly routerFactory;
    private readonly procedureFactory;
    private readonly middlewareFactory;
    private readonly importsScanner;
    onModuleInit(): void;
    generateSchemaFile(schemaImports?: Array<SchemaImports> | undefined): Promise<void>;
    generateHelpersFile(context?: Class<TRPCContext>): Promise<void>;
    private buildRootImportsMap;
}
//# sourceMappingURL=trpc.generator.d.ts.map