import { ProcedureGeneratorMetadata } from '../interfaces/generator.interface';
import { Project, SourceFile, Node } from 'ts-morph';
export declare class ProcedureGenerator {
    private readonly importsScanner;
    private readonly staticGenerator;
    private readonly appRouterSourceFile;
    generateProcedureString(procedure: ProcedureGeneratorMetadata): string;
    flattenZodSchema(node: Node, sourceFile: SourceFile, project: Project, schema: string): string;
}
//# sourceMappingURL=procedure.generator.d.ts.map