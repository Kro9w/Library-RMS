import { Class, Constructor } from 'type-fest';
import { TRPCMiddleware } from '../interfaces';
interface MiddlewareMetadata {
    path: string;
    instance: Class<TRPCMiddleware> | Constructor<TRPCMiddleware>;
}
export declare class MiddlewareFactory {
    private readonly routerFactory;
    private readonly procedureFactory;
    getMiddlewares(): Array<MiddlewareMetadata>;
}
export {};
//# sourceMappingURL=middleware.factory.d.ts.map