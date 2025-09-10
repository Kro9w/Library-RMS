"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRPCDriver = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const server_1 = require("@trpc/server");
const trpc_factory_1 = require("./factories/trpc.factory");
const app_router_host_1 = require("./app-router.host");
const drivers_1 = require("./drivers");
function isExpressApplication(app) {
    return (typeof app === 'function' &&
        typeof app.get === 'function' &&
        typeof app.post === 'function' &&
        typeof app.use === 'function' &&
        typeof app.listen === 'function');
}
function isFastifyApplication(app) {
    return (typeof app === 'object' &&
        app !== null &&
        typeof app.get === 'function' &&
        typeof app.post === 'function' &&
        typeof app.register === 'function' &&
        typeof app.listen === 'function');
}
let TRPCDriver = class TRPCDriver {
    constructor(moduleRef) {
        this.moduleRef = moduleRef;
    }
    async start(options) {
        //@ts-expect-error Ignoring typescript here since it's the same type, yet it still isn't able to infer it.
        const { procedure, router } = server_1.initTRPC.context().create({
            ...(options.transformer != null
                ? { transformer: options.transformer }
                : {}),
            ...(options.errorFormatter != null ? { errorFormatter: options.errorFormatter } : {}),
        });
        const appRouter = this.trpcFactory.serializeAppRoutes(router, procedure);
        this.appRouterHost.appRouter = appRouter;
        const contextClass = options.context;
        const contextInstance = contextClass != null
            ? this.moduleRef.get(contextClass, {
                strict: false,
            })
            : null;
        const { httpAdapter } = this.httpAdapterHost;
        const platformName = httpAdapter.getType();
        const app = httpAdapter.getInstance();
        if (platformName === 'express' && isExpressApplication(app)) {
            await this.expressDriver.start(options, app, appRouter, contextInstance);
        }
        else if (platformName === 'fastify' && isFastifyApplication(app)) {
            await this.fastifyDriver.start(options, app, appRouter, contextInstance);
        }
        else {
            throw new Error(`Unsupported http adapter: ${platformName}`);
        }
    }
};
exports.TRPCDriver = TRPCDriver;
tslib_1.__decorate([
    (0, common_1.Inject)(core_1.HttpAdapterHost),
    tslib_1.__metadata("design:type", core_1.HttpAdapterHost)
], TRPCDriver.prototype, "httpAdapterHost", void 0);
tslib_1.__decorate([
    (0, common_1.Inject)(trpc_factory_1.TRPCFactory),
    tslib_1.__metadata("design:type", trpc_factory_1.TRPCFactory)
], TRPCDriver.prototype, "trpcFactory", void 0);
tslib_1.__decorate([
    (0, common_1.Inject)(common_1.ConsoleLogger),
    tslib_1.__metadata("design:type", common_1.ConsoleLogger)
], TRPCDriver.prototype, "consoleLogger", void 0);
tslib_1.__decorate([
    (0, common_1.Inject)(app_router_host_1.AppRouterHost),
    tslib_1.__metadata("design:type", app_router_host_1.AppRouterHost)
], TRPCDriver.prototype, "appRouterHost", void 0);
tslib_1.__decorate([
    (0, common_1.Inject)(drivers_1.ExpressDriver),
    tslib_1.__metadata("design:type", drivers_1.ExpressDriver)
], TRPCDriver.prototype, "expressDriver", void 0);
tslib_1.__decorate([
    (0, common_1.Inject)(drivers_1.FastifyDriver),
    tslib_1.__metadata("design:type", drivers_1.FastifyDriver)
], TRPCDriver.prototype, "fastifyDriver", void 0);
exports.TRPCDriver = TRPCDriver = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [core_1.ModuleRef])
], TRPCDriver);
//# sourceMappingURL=trpc.driver.js.map