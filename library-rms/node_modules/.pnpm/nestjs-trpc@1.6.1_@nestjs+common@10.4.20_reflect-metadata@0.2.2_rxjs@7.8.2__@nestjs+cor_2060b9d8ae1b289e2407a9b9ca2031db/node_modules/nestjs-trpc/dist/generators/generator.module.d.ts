import { OnModuleInit } from '@nestjs/common';
import { DynamicModule } from '@nestjs/common/interfaces';
import { GeneratorModuleOptions } from './generator.interface';
export declare class GeneratorModule implements OnModuleInit {
    private readonly trpcGenerator;
    private readonly options;
    static forRoot(options: GeneratorModuleOptions): DynamicModule;
    onModuleInit(): Promise<void>;
}
//# sourceMappingURL=generator.module.d.ts.map