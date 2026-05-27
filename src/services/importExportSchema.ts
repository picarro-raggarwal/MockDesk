import { z } from "zod";

const keyValuePairSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
});

const matchWhenSchema = z
  .object({
    headers: z.record(z.string()).optional(),
    query: z.record(z.string()).optional(),
    bodyContains: z.string().optional(),
  })
  .optional();

const mockResponseSchema = z.object({
  id: z.string(),
  statusCode: z.number().int(),
  delayMs: z.number().int().min(0),
  responseType: z.enum(["success", "error"]),
  bodyJson: z.string(),
  name: z.string().optional(),
  matchWhen: matchWhenSchema,
});

const httpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const mockApiSchema = z.object({
  id: z.string(),
  collectionId: z.string().nullable(),
  name: z.string().min(1),
  baseUrl: z.string().min(1),
  path: z.string(),
  pathVersionPrefix: z.string().optional(),
  method: httpMethodSchema,
  description: z.string().optional(),
  tags: z.array(z.string()),
  headers: z.array(keyValuePairSchema),
  queryParams: z.array(keyValuePairSchema),
  requestBodySchema: z.string().optional(),
  responses: z.array(mockResponseSchema),
  defaultResponseId: z.string().nullable(),
  environmentId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const environmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  variables: z.array(keyValuePairSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const wsMessageSchema = z.object({
  id: z.string(),
  delayMs: z.number().int().min(0),
  payloadJson: z.string(),
});

export const wsScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  path: z.string(),
  messages: z.array(wsMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const appExportSchema = z
  .object({
    version: z.enum(["1.0", "1.1"]),
    exportedAt: z.string().optional(),
    collections: z.array(collectionSchema),
    apis: z.array(mockApiSchema),
    environments: z.array(environmentSchema).optional(),
    currentEnvId: z.string().nullable().optional(),
    wsScenarios: z.array(wsScenarioSchema).optional(),
  })
  .transform((d) => ({
    version: "1.1" as const,
    exportedAt: d.exportedAt,
    collections: d.collections,
    apis: d.apis.map((a) => ({
      ...a,
      pathVersionPrefix: a.pathVersionPrefix ?? "",
      environmentId: a.environmentId ?? null,
      responses: a.responses.map((r) => ({
        ...r,
        matchWhen: r.matchWhen,
      })),
    })),
    environments: d.environments ?? [],
    currentEnvId: d.currentEnvId ?? null,
    wsScenarios: d.wsScenarios ?? [],
  }));

/** Normalized app export after schema parse + transform (v1.1 shape). */
export type ParsedExport = z.output<typeof appExportSchema>;
