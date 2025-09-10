import { Project, OptionalKind, PropertySignatureStructure } from 'ts-morph';
import { TRPCMiddleware } from '../interfaces';
import type { Class } from 'type-fest';
export declare class MiddlewareGenerator {
    getMiddlewareInterface(routerFilePath: string, middleware: Class<TRPCMiddleware>, project: Project): Promise<{
        name: string;
        properties: Array<OptionalKind<PropertySignatureStructure>>;
    } | null>;
    private extractCtxTypeFromUseMethod;
    private getClassDeclaration;
    private typeToProperties;
}
//# sourceMappingURL=middleware.generator.d.ts.map