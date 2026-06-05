export {};

declare global {
  interface Window {
    electronAPI: {
      executeQuery(
        sql: string,
        params: any[]
      ): Promise<any>;
    };
  }
}