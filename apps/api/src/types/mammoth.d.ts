declare module "mammoth" {
  export type MammothResult = { value: string; messages: any[] };
  export function convertToHtml(options: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>;
}