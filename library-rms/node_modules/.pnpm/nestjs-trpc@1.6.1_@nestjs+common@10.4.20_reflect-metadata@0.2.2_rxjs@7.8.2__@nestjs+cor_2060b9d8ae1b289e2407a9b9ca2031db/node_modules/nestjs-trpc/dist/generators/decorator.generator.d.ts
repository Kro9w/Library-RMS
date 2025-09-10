import { Decorator, Project, SourceFile } from 'ts-morph';
import { DecoratorGeneratorMetadata } from '../interfaces/generator.interface';
export declare class DecoratorGenerator {
    private readonly consoleLogger;
    private readonly procedureGenerator;
    serializeProcedureDecorators(decorators: Decorator[], sourceFile: SourceFile, project: Project): Array<DecoratorGeneratorMetadata>;
    getDecoratorPropertyValue(decorator: Decorator, propertyName: string, sourceFile: SourceFile, project: Project): string | null;
}
//# sourceMappingURL=decorator.generator.d.ts.map