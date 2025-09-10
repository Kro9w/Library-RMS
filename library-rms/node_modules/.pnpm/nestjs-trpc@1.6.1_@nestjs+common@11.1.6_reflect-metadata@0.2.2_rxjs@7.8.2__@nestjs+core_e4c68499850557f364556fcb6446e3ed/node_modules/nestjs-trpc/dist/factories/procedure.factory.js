"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcedureFactory = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const trpc_constants_1 = require("../trpc.constants");
const factory_interface_1 = require("../interfaces/factory.interface");
const trpc_enum_1 = require("../trpc.enum");
const lodash_1 = require("lodash");
let ProcedureFactory = class ProcedureFactory {
    constructor(moduleRef) {
        this.moduleRef = moduleRef;
    }
    getProcedures(instance, prototype) {
        const methodNames = this.metadataScanner.getAllMethodNames(instance);
        return methodNames.map((name) => this.extractProcedureMetadata(name, prototype));
    }
    extractProcedureParams(prototype, name) {
        return Reflect.getMetadata(trpc_constants_1.PROCEDURE_PARAM_METADATA_KEY, prototype, name);
    }
    extractProcedureMetadata(name, prototype) {
        const callback = prototype[name];
        const type = Reflect.getMetadata(trpc_constants_1.PROCEDURE_TYPE_KEY, callback);
        const metadata = Reflect.getMetadata(trpc_constants_1.PROCEDURE_METADATA_KEY, callback);
        const middlewares = Reflect.getMetadata(trpc_constants_1.MIDDLEWARES_KEY, callback) || [];
        return {
            input: metadata?.input,
            output: metadata?.output,
            middlewares,
            type,
            name: callback.name,
            implementation: callback,
            params: this.extractProcedureParams(prototype, name),
        };
    }
    serializeProcedures(procedures, instance, camelCasedRouterName, procedureBuilder, routerMiddlewares) {
        const serializedProcedures = Object.create({});
        for (const procedure of procedures) {
            const { input, output, type, middlewares, name, params } = procedure;
            const uniqueMiddlewares = (0, lodash_1.uniqWith)([...routerMiddlewares, ...middlewares], lodash_1.isEqual);
            const procedureInstance = this.createProcedureInstance(procedureBuilder, uniqueMiddlewares);
            const routerInstance = this.moduleRef.get(instance.constructor, {
                strict: false,
            });
            serializedProcedures[name] = this.createSerializedProcedure(procedureInstance, name, input, output, type, routerInstance, params);
            this.consoleLogger.log(`Mapped {${type}, ${camelCasedRouterName}.${name}} route.`, 'Router Factory');
        }
        return serializedProcedures;
    }
    createProcedureInstance(procedure, middlewares) {
        for (const middleware of middlewares) {
            const customProcedureInstance = this.moduleRef.get(middleware, {
                strict: false,
            });
            if (typeof customProcedureInstance.use === 'function') {
                //@ts-expect-error this is expected since the type is correct.
                procedure = procedure.use((opts) => customProcedureInstance.use(opts));
            }
        }
        return procedure;
    }
    serializeProcedureParams(opts, params) {
        if (params == null) {
            return [];
        }
        return new Array(Math.max(...params.map((val) => val.index)) + 1)
            .fill(undefined)
            .map((_val, idx) => {
            const param = params.find((param) => param.index === idx);
            if (param == null) {
                return undefined;
            }
            if (param.type === factory_interface_1.ProcedureParamDecoratorType.Input) {
                return param['key'] != null
                    ? opts[param.type]?.[param['key']]
                    : opts[param.type];
            }
            if (param.type === factory_interface_1.ProcedureParamDecoratorType.Options) {
                return opts;
            }
            return opts[param.type];
        });
    }
    createSerializedProcedure(procedureInstance, procedureName, input, output, type, routerInstance, params) {
        const procedureWithInput = input
            ? procedureInstance.input(input)
            : procedureInstance;
        const procedureWithOutput = output
            ? procedureWithInput.output(output)
            : procedureWithInput;
        const procedureInvocation = (opts) => {
            return routerInstance[procedureName](...this.serializeProcedureParams(opts, params));
        };
        return type === trpc_enum_1.ProcedureType.Mutation
            ? procedureWithOutput.mutation(procedureInvocation)
            : procedureWithOutput.query(procedureInvocation);
    }
};
exports.ProcedureFactory = ProcedureFactory;
tslib_1.__decorate([
    (0, common_1.Inject)(common_1.ConsoleLogger),
    tslib_1.__metadata("design:type", common_1.ConsoleLogger)
], ProcedureFactory.prototype, "consoleLogger", void 0);
tslib_1.__decorate([
    (0, common_1.Inject)(core_1.MetadataScanner),
    tslib_1.__metadata("design:type", core_1.MetadataScanner)
], ProcedureFactory.prototype, "metadataScanner", void 0);
exports.ProcedureFactory = ProcedureFactory = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [core_1.ModuleRef])
], ProcedureFactory);
//# sourceMappingURL=procedure.factory.js.map