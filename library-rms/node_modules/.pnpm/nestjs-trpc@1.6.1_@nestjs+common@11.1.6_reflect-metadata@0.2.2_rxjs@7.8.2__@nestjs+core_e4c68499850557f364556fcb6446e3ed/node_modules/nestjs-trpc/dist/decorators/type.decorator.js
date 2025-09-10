"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Type = Type;
const factory_interface_1 = require("../interfaces/factory.interface");
const trpc_constants_1 = require("../trpc.constants");
/**
 * Type procedure parameter decorator. Extracts the `type` parameter out of the procedure `opts`.
 *
 * @see [Parameter Decorators](https://www.nestjs-trpc.io/docs/routers#parameter-decorators)
 *
 * @publicApi
 */
function Type() {
    return (target, propertyKey, parameterIndex) => {
        if (propertyKey != null) {
            const existingParams = Reflect.getMetadata(trpc_constants_1.PROCEDURE_PARAM_METADATA_KEY, target, propertyKey) || [];
            const procedureParamMetadata = {
                type: factory_interface_1.ProcedureParamDecoratorType.Type,
                index: parameterIndex,
            };
            existingParams.push(procedureParamMetadata);
            Reflect.defineMetadata(trpc_constants_1.PROCEDURE_PARAM_METADATA_KEY, existingParams, target, propertyKey);
        }
    };
}
//# sourceMappingURL=type.decorator.js.map