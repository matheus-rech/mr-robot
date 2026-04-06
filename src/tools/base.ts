export interface Tool {
  name: string;
  description: string;
  execute(args: string): Promise<string>;
}
