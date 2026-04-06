export interface BaseChannel {
  name: string;
  start(): Promise<void>;
  send(message: string): Promise<void>;
}
