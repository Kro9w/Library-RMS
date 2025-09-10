declare module "mammoth" {
  export function convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}