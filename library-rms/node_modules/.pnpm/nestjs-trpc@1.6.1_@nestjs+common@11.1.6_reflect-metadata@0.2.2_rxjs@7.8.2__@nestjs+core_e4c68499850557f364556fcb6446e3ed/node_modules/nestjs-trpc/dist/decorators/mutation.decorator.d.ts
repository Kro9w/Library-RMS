import { ZodSchema } from 'zod';
/**
 * Decorator that marks a router class method as a TRPC mutation procedure that can receive inbound
 * requests and produce responses.
 *
 * An TRPC query procedure is mainly responsible for actions that modify or creates server-side data.
 * for example `Mutation /trpc/userRouter.createUser`.
 *
 * @param {object} args configuration object specifying:
 * - `input` - defines a `ZodSchema` validation logic for the input.
 * - `output` - defines a `ZodSchema` validation logic for the output.
 *
 * @see [Method Decorators](https://nestjs-trpc.io/docs/routers#procedures)
 *
 * @publicApi
 */
export declare function Mutation(args?: {
    input?: ZodSchema;
    output?: ZodSchema;
}): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
//# sourceMappingURL=mutation.decorator.d.ts.map