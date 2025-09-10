import { SourceFile } from 'ts-morph';
import type { TRPCContext } from '../interfaces';
import type { Class } from 'type-fest';
export declare class ContextGenerator {
    getContextInterface(sourceFile: SourceFile, context: Class<TRPCContext>): Promise<string | null>;
    private extractReturnTypeFromCreateMethod;
    private isPromiseType;
    private getClassDeclaration;
}
//# sourceMappingURL=context.generator.d.ts.map