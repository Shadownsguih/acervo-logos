declare module "sql.js" {
  type SqlJsQueryResult = {
    columns: string[];
    values: unknown[][];
  };

  class Database {
    constructor(data?: Uint8Array);
    exec(sql: string, params?: unknown[]): SqlJsQueryResult[];
    close(): void;
  }

  type InitSqlJsStatic = {
    Database: typeof Database;
  };

  export default function initSqlJs(
    config?: Record<string, unknown>
  ): Promise<InitSqlJsStatic>;
}