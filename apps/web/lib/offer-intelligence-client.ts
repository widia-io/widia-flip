import {
  ApiErrorSchema,
  EnforcementErrorResponseSchema,
  OfferIntelligenceGenerateRequestSchema,
  OfferIntelligenceHistoryQuerySchema,
  OfferIntelligenceHistoryResponseSchema,
  OfferIntelligencePreviewSchema,
  OfferIntelligenceSaveRequestSchema,
  OfferIntelligenceSaveResponseSchema,
  type OfferIntelligenceGenerateRequest,
  type OfferIntelligenceHistoryResponse,
  type OfferIntelligencePreview,
  type OfferIntelligenceSaveRequest,
  type OfferIntelligenceSaveResponse,
} from "@widia/shared";

export class OfferIntelligenceClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: string[];
  readonly retryAfter?: number;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: string[];
    retryAfter?: number;
  }) {
    super(`${params.code}: ${params.message}`);
    this.name = "OfferIntelligenceClientError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.retryAfter = params.retryAfter;
  }
}

export class OfferRateLimitedError extends OfferIntelligenceClientError {
  constructor(message: string, status: number, retryAfter?: number, details?: string[]) {
    super({ code: "RATE_LIMITED", message, status, retryAfter, details });
    this.name = "OfferRateLimitedError";
  }
}

export class OfferPaywallRequiredError extends OfferIntelligenceClientError {
  constructor(message: string, status: number, details?: string[]) {
    super({ code: "PAYWALL_REQUIRED", message, status, details });
    this.name = "OfferPaywallRequiredError";
  }
}

async function requestWithValidation<T>(
  input: RequestInfo,
  init: RequestInit,
  parse: (raw: unknown) => T | null,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    const parsedJson = safeJson(text);
    const parsedError = ApiErrorSchema.safeParse(parsedJson);
    const parsedEnforcement = EnforcementErrorResponseSchema.safeParse(parsedJson);
    const retryAfterRaw = response.headers.get("Retry-After");
    const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;

    if (parsedError.success) {
      const { code, message, details } = parsedError.data.error;
      if (code === "RATE_LIMITED") {
        throw new OfferRateLimitedError(message, response.status, retryAfter, details);
      }
      if (code === "PAYWALL_REQUIRED") {
        throw new OfferPaywallRequiredError(message, response.status, details);
      }
      throw new OfferIntelligenceClientError({
        code,
        message,
        status: response.status,
        details,
        retryAfter,
      });
    }

    if (parsedEnforcement.success) {
      const { code, message, details } = parsedEnforcement.data.error;
      const detailHints: string[] = [];
      if (details.metric) detailHints.push(`metric=${details.metric}`);
      if (details.tier) detailHints.push(`tier=${details.tier}`);

      if (code === "PAYWALL_REQUIRED") {
        throw new OfferPaywallRequiredError(
          message,
          response.status,
          detailHints.length > 0 ? detailHints : undefined,
        );
      }

      throw new OfferIntelligenceClientError({
        code,
        message,
        status: response.status,
        details: detailHints.length > 0 ? detailHints : undefined,
        retryAfter,
      });
    }

    if (response.status === 402) {
      throw new OfferPaywallRequiredError(
        "Este recurso exige upgrade de plano.",
        response.status,
      );
    }

    throw new OfferIntelligenceClientError({
      code: "API_ERROR",
      message: `Request failed with status ${response.status}`,
      status: response.status,
      retryAfter,
    });
  }

  const raw = await response.json();
  const parsed = parse(raw);
  if (!parsed) {
    throw new OfferIntelligenceClientError({
      code: "INVALID_RESPONSE",
      message: "Invalid response payload",
      status: 502,
    });
  }

  return parsed;
}

export async function generateOfferIntelligence(
  prospectId: string,
  payload: OfferIntelligenceGenerateRequest = {},
): Promise<OfferIntelligencePreview> {
  const parsedPayload = OfferIntelligenceGenerateRequestSchema.parse(payload);

  return requestWithValidation(
    `/api/prospects/${prospectId}/offer-intelligence/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedPayload),
    },
    (raw) => {
      const parsed = OfferIntelligencePreviewSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
      return null;
    },
  );
}

export async function saveOfferIntelligence(
  prospectId: string,
  payload: OfferIntelligenceSaveRequest = {},
): Promise<OfferIntelligenceSaveResponse> {
  const parsedPayload = OfferIntelligenceSaveRequestSchema.parse(payload);

  return requestWithValidation(
    `/api/prospects/${prospectId}/offer-intelligence/save`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedPayload),
    },
    (raw) => {
      const parsed = OfferIntelligenceSaveResponseSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
      return null;
    },
  );
}

export async function listOfferIntelligenceHistory(
  prospectId: string,
  query: { limit?: number; cursor?: string } = {},
): Promise<OfferIntelligenceHistoryResponse> {
  const parsedQuery = OfferIntelligenceHistoryQuerySchema.parse(query);
  const params = new URLSearchParams({ limit: String(parsedQuery.limit) });
  if (parsedQuery.cursor) {
    params.set("cursor", parsedQuery.cursor);
  }

  return requestWithValidation(
    `/api/prospects/${prospectId}/offer-intelligence/history?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
    (raw) => {
      const parsed = OfferIntelligenceHistoryResponseSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
      return null;
    },
  );
}

export async function deleteOfferIntelligence(
  prospectId: string,
  recommendationId: string,
): Promise<void> {
  const response = await fetch(
    `/api/prospects/${prospectId}/offer-intelligence/${recommendationId}`,
    {
      method: "DELETE",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    const parsedJson = safeJson(text);
    const parsedError = ApiErrorSchema.safeParse(parsedJson);
    const parsedEnforcement = EnforcementErrorResponseSchema.safeParse(parsedJson);
    const retryAfterRaw = response.headers.get("Retry-After");
    const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;

    if (parsedError.success) {
      const { code, message, details } = parsedError.data.error;
      if (code === "RATE_LIMITED") {
        throw new OfferRateLimitedError(message, response.status, retryAfter, details);
      }
      if (code === "PAYWALL_REQUIRED") {
        throw new OfferPaywallRequiredError(message, response.status, details);
      }
      throw new OfferIntelligenceClientError({
        code,
        message,
        status: response.status,
        details,
        retryAfter,
      });
    }

    if (parsedEnforcement.success) {
      const { code, message, details } = parsedEnforcement.data.error;
      const detailHints: string[] = [];
      if (details.metric) detailHints.push(`metric=${details.metric}`);
      if (details.tier) detailHints.push(`tier=${details.tier}`);

      if (code === "PAYWALL_REQUIRED") {
        throw new OfferPaywallRequiredError(
          message,
          response.status,
          detailHints.length > 0 ? detailHints : undefined,
        );
      }

      throw new OfferIntelligenceClientError({
        code,
        message,
        status: response.status,
        details: detailHints.length > 0 ? detailHints : undefined,
        retryAfter,
      });
    }

    if (response.status === 402) {
      throw new OfferPaywallRequiredError(
        "Este recurso exige upgrade de plano.",
        response.status,
      );
    }

    throw new OfferIntelligenceClientError({
      code: "API_ERROR",
      message: `Request failed with status ${response.status}`,
      status: response.status,
      retryAfter,
    });
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
