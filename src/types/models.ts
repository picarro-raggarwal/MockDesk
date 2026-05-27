export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type MockResponseType = "success" | "error";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

/** When set, this response is used only if all clauses match the incoming request. */
export interface ResponseMatchWhen {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  /** Request body must include this substring (for POST/PUT/PATCH). */
  bodyContains?: string;
}

export interface MockResponse {
  id: string;
  statusCode: number;
  delayMs: number;
  responseType: MockResponseType;
  /** Raw JSON string for response body */
  bodyJson: string;
  name?: string;
  matchWhen?: ResponseMatchWhen;
}

export interface MockApi {
  id: string;
  collectionId: string | null;
  name: string;
  baseUrl: string;
  path: string;
  /** Prepended after base pathname for matching only, e.g. `/v1` → `/api/v1/users`. Empty string if unused. */
  pathVersionPrefix: string;
  method: HttpMethod;
  description?: string;
  tags: string[];
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  requestBodySchema?: string;
  responses: MockResponse[];
  /** Which response the mock runtime uses by default */
  defaultResponseId: string | null;
  /**
   * Optional environment override for this API.
   * When set, the mock engine uses this environment's variables instead of the globally active one.
   * null = inherit the global active environment.
   */
  environmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type ThemeMode = "light" | "dark";

export interface AppEnvironment {
  id: string;
  name: string;
  variables: KeyValuePair[];
  createdAt: string;
  updatedAt: string;
}

export interface WsScenarioMessage {
  id: string;
  delayMs: number;
  payloadJson: string;
}

export interface WsScenario {
  id: string;
  name: string;
  description?: string;
  /** Virtual path label for docs / export, e.g. `/ws/live` */
  path: string;
  messages: WsScenarioMessage[];
  createdAt: string;
  updatedAt: string;
}

export type AppDataVersion = "1.0" | "1.1";

export interface AppExportPayload {
  version: AppDataVersion;
  exportedAt?: string;
  collections: Collection[];
  apis: MockApi[];
  environments: AppEnvironment[];
  currentEnvId: string | null;
  wsScenarios: WsScenario[];
}
