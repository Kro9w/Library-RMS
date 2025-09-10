export declare class InvalidDecoratorItemException extends Error {
    private readonly msg;
    constructor(decorator: string, item: string, context: string);
    what(): string;
}
export declare function validateEach(context: {
    name: string;
}, arr: any[], predicate: (...args: any) => unknown, decorator: string, item: string): boolean;
//# sourceMappingURL=validate-each.util.d.ts.map