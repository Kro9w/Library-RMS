"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mutation = Mutation;
const common_1 = require("@nestjs/common");
const trpc_constants_1 = require("../trpc.constants");
const trpc_enum_1 = require("../trpc.enum");
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
function Mutation(args) {
    return (0, common_1.applyDecorators)(...[
        (0, common_1.SetMetadata)(trpc_constants_1.PROCEDURE_TYPE_KEY, trpc_enum_1.ProcedureType.Mutation),
        (0, common_1.SetMetadata)(trpc_constants_1.PROCEDURE_METADATA_KEY, args),
    ]);
}
//# sourceMappingURL=mutation.decorator.js.map