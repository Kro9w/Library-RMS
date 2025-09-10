"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcedureGenerator = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const trpc_enum_1 = require("../trpc.enum");
const ts_morph_1 = require("ts-morph");
const imports_scanner_1 = require("../scanners/imports.scanner");
const static_generator_1 = require("./static.generator");
const generator_constants_1 = require("./generator.constants");
let ProcedureGenerator = class ProcedureGenerator {
    generateProcedureString(procedure) {
        const { name, decorators } = procedure;
        const decorator = decorators.find((decorator) => decorator.name === trpc_enum_1.ProcedureType.Mutation ||
            decorator.name === trpc_enum_1.ProcedureType.Query);
        if (!decorator) {
            return '';
        }
        const decoratorArgumentsArray = Object.entries(decorator.arguments)
            .map(([key, value]) => `.${key}(${value})`)
            .join('');
        return `${name}: publicProcedure${decoratorArgumentsArray}.${decorator.name.toLowerCase()}(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any )`;
    }
    flattenZodSchema(node, sourceFile, project, schema) {
        const importsMap = this.importsScanner.buildSourceFileImportsMap(sourceFile, project);
        if (ts_morph_1.Node.isIdentifier(node)) {
            const identifierName = node.getText();
            const identifierDeclaration = sourceFile.getVariableDeclaration(identifierName);
            if (identifierDeclaration != null) {
                const identifierInitializer = identifierDeclaration.getInitializer();
                if (identifierInitializer != null) {
                    const identifierSchema = this.flattenZodSchema(identifierInitializer, sourceFile, project, identifierInitializer.getText());
                    schema = schema.replace(identifierName, identifierSchema);
                }
            }
            else if (importsMap.has(identifierName)) {
                const importedIdentifier = importsMap.get(identifierName);
                if (importedIdentifier != null) {
                    const { initializer } = importedIdentifier;
                    const identifierSchema = this.flattenZodSchema(initializer, importedIdentifier.sourceFile, project, initializer.getText());
                    schema = schema.replace(identifierName, identifierSchema);
                }
            }
        }
        else if (ts_morph_1.Node.isObjectLiteralExpression(node)) {
            for (const property of node.getProperties()) {
                if (ts_morph_1.Node.isPropertyAssignment(property)) {
                    const propertyText = property.getText();
                    const propertyInitializer = property.getInitializer();
                    if (propertyInitializer != null) {
                        schema = schema.replace(propertyText, this.flattenZodSchema(propertyInitializer, sourceFile, project, propertyText));
                    }
                }
            }
        }
        else if (ts_morph_1.Node.isArrayLiteralExpression(node)) {
            for (const element of node.getElements()) {
                const elementText = element.getText();
                schema = schema.replace(elementText, this.flattenZodSchema(element, sourceFile, project, elementText));
            }
        }
        else if (ts_morph_1.Node.isCallExpression(node)) {
            const expression = node.getExpression();
            if (ts_morph_1.Node.isPropertyAccessExpression(expression) &&
                !expression.getText().startsWith('z')) {
                const baseSchema = this.flattenZodSchema(expression, sourceFile, project, expression.getText());
                const propertyName = expression.getName();
                schema = schema.replace(expression.getText(), `${baseSchema}.${propertyName}`);
            }
            else if (!expression.getText().startsWith('z')) {
                this.staticGenerator.addSchemaImports(this.appRouterSourceFile, [expression.getText()], importsMap);
            }
            for (const arg of node.getArguments()) {
                const argText = arg.getText();
                schema = schema.replace(argText, this.flattenZodSchema(arg, sourceFile, project, argText));
            }
        }
        else if (ts_morph_1.Node.isPropertyAccessExpression(node)) {
            schema = this.flattenZodSchema(node.getExpression(), sourceFile, project, node.getExpression().getText());
        }
        return schema;
    }
};
exports.ProcedureGenerator = ProcedureGenerator;
tslib_1.__decorate([
    (0, common_1.Inject)(imports_scanner_1.ImportsScanner),
    tslib_1.__metadata("design:type", imports_scanner_1.ImportsScanner)
], ProcedureGenerator.prototype, "importsScanner", void 0);
tslib_1.__decorate([
    (0, common_1.Inject)(static_generator_1.StaticGenerator),
    tslib_1.__metadata("design:type", static_generator_1.StaticGenerator)
], ProcedureGenerator.prototype, "staticGenerator", void 0);
tslib_1.__decorate([
    (0, common_1.Inject)(generator_constants_1.TYPESCRIPT_APP_ROUTER_SOURCE_FILE),
    tslib_1.__metadata("design:type", ts_morph_1.SourceFile)
], ProcedureGenerator.prototype, "appRouterSourceFile", void 0);
exports.ProcedureGenerator = ProcedureGenerator = tslib_1.__decorate([
    (0, common_1.Injectable)()
], ProcedureGenerator);
//# sourceMappingURL=procedure.generator.js.map