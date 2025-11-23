declare namespace NodeJS {
  type Signals = "SIGINT" | "SIGTERM";
}

declare const process: {
  env: Record<string, string | undefined>;
  on: (event: NodeJS.Signals, listener: (...args: any[]) => void) => void;
  exit: (code?: number) => never;
};

declare function fetch(input: string, init?: any): Promise<any>;
