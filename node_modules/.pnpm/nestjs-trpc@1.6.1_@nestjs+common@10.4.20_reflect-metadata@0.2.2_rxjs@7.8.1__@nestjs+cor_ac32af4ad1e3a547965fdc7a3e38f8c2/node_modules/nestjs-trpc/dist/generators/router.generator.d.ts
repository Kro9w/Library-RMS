import { Project } from 'ts-morph';
import { RouterGeneratorMetadata } from '../interfaces/generator.interface';
import { RoutersFactoryMetadata } from '../interfaces/factory.interface';
export declare class RouterGenerator {
    private readonly decoratorHandler;
    private readonly procedureGenerator;
    serializeRouters(routers: Array<RoutersFactoryMetadata>, project: Project): Array<RouterGeneratorMetadata>;
    private serializeRouterProcedures;
    generateRoutersStringFromMetadata(routers: Array<RouterGeneratorMetadata>): string;
}
//# sourceMappingURL=router.generator.d.ts.map