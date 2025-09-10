"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = Input;
const factory_interface_1 = require("../interfaces/factory.interface");
const trpc_constants_1 = require("../trpc.constants");
/**
 * Input procedure parameter decorator. Extracts the `input` parameter out of the procedure `opts`.
 *
 * @param key string to be used extracting a specific input key - `input[key]`.
 *
 * @see [Parameter Decorators](https://www.nestjs-trpc.io/docs/routers#parameter-decorators)
 *
 * @publicApi
 */
function Input(key) {
    return (target, propertyKey, parameterIndex) => {
        if (propertyKey != null && typeof parameterIndex === 'number') {
            const existingParams = Reflect.getMetadata(trpc_constants_1.PROCEDURE_PARAM_METADATA_KEY, target, propertyKey) || [];
            const procedureParamMetadata = {
                type: factory_interface_1.ProcedureParamDecoratorType.Input,
                index: parameterIndex,
                key,
            };
            existingParams.push(procedureParamMetadata);
            Reflect.defineMetadata(trpc_constants_1.PROCEDURE_PARAM_METADATA_KEY, existingParams, target, propertyKey);
        }
    };
}
//# sourceMappingURL=input.decorator.js.map