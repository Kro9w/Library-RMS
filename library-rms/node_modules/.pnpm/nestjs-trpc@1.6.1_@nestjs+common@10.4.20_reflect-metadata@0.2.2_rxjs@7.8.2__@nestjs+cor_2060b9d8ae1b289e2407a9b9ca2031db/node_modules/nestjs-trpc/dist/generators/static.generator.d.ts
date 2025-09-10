import { SourceFile, Type } from 'ts-morph';
import { SourceFileImportsMap } from '../interfaces/generator.interface';
export declare class StaticGenerator {
    generateStaticDeclaration(sourceFile: SourceFile): void;
    addSchemaImports(sourceFile: SourceFile, schemaImportNames: Array<string>, importsMap: Map<string, SourceFileImportsMap>): void;
    findCtxOutProperty(type: Type): string | undefined;
}
//# sourceMappingURL=static.generator.d.ts.map