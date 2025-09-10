import type { Class, Constructor } from 'type-fest';
import type { TRPCMiddleware } from '../interfaces';
/**
 * TODO: Generate Return Context Type.
 *
 * Decorator that binds middlewares to the scope of the router or a procedure,
 * depending on its context.
 *
 * When `@UseMiddlewares` is used at the router level, the middleware will be
 * applied to every handler (method) in the router.
 *
 * When `@UseMiddlewares` is used at the individual handler level, the middleware
 * will apply only to that specific method.
 *
 * @param middlewares a single middleware instance or class, or a list of comma separated middleware instances
 * or classes.
 *
 * @see [Middlewares](https://nestjs-trpc.io/docs/middlewares)
 *
 * @publicApi
 */
export declare function UseMiddlewares(...middlewares: Array<Class<TRPCMiddleware> | Constructor<TRPCMiddleware>>): MethodDecorator & ClassDecorator;
/**
 * @deprecated Use `@UseMiddlewares` instead. This decorator is deprecated
 * in order to satisfy NestJS naming convention fe. `@UseGuards`.
 *
 * Decorator that binds middlewares to the scope of the router or a procedure,
 * depending on its context.
 *
 * When `@Middlewares` is used at the router level, the middleware will be
 * applied to every handler (method) in the router.
 *
 * When `@Middlewares` is used at the individual handler level, the middleware
 * will apply only to that specific method.
 *
 * @param middlewares a single middleware instance or class, or a list of comma separated middleware instances
 * or classes.
 *
 * @see [Middlewares](https://nestjs-trpc.io/docs/middlewares)
 *
 * @publicApi
 */
export declare function Middlewares(...middlewares: Array<Class<TRPCMiddleware> | Constructor<TRPCMiddleware>>): MethodDecorator & ClassDecorator;
//# sourceMappingURL=middlewares.decorator.d.ts.map