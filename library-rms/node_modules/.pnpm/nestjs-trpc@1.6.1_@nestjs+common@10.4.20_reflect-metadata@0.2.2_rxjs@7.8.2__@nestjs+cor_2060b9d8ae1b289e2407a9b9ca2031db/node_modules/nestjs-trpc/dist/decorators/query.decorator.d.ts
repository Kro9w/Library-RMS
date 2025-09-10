import { ZodSchema } from 'zod';
/**
 * Decorator that marks a router class method as a TRPC query procedure that can receive inbound
 * requests and produce responses.
 *
 * An TRPC query procedure is mainly responsible for actions that retrieve data.
 * for example `Query /trpc/userRouter.getUsers`.
 *
 * @param {object} args configuration object specifying:
 * - `input` - defines a `ZodSchema` validation logic for the input.
 * - `output` - defines a `ZodSchema` validation logic for the output.
 *
 * @see [Method Decorators](https://nestjs-trpc.io/docs/routers#procedures)
 *
 * @publicApi
 */
export declare function Query(args?: {
    input?: ZodSchema;
    output?: ZodSchema;
}): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
//# sourceMappingURL=query.decorator.d.ts.map