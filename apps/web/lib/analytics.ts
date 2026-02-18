const ANALYTICS_ENDPOINT = "/api/analytics/track";
const SESSION_COOKIE_NAME = "widia_session_id";
const SESSION_STORAGE_KEY = "widia_session_id";
const VARIANT_STORAGE_KEY = "widia_variant";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type DeviceType = "mobile" | "desktop" | "tablet" | "unknown";

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `sess_${crypto.randomUUID()}`;
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function safeLocalStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore blocked storage environments.
  }
}

function setSessionCookie(value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function getSessionFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function ensureAnalyticsSessionId(): string | null {
  if (typeof window === "undefined") return null;

  const fromStorage = safeLocalStorageGet(SESSION_STORAGE_KEY);
  if (fromStorage) {
    setSessionCookie(fromStorage);
    return fromStorage;
  }

  const fromCookie = getSessionFromCookie();
  if (fromCookie) {
    safeLocalStorageSet(SESSION_STORAGE_KEY, fromCookie);
    return fromCookie;
  }

  const created = createSessionId();
  safeLocalStorageSet(SESSION_STORAGE_KEY, created);
  setSessionCookie(created);
  return created;
}

function detectDeviceType(): DeviceType {
  if (typeof window === "undefined") return "unknown";
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function detectVariant(): string {
  if (typeof window === "undefined") return "control";

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("variant") || params.get("ab_variant");
  if (fromQuery) {
    safeLocalStorageSet(VARIANT_STORAGE_KEY, fromQuery);
    return fromQuery;
  }

  return safeLocalStorageGet(VARIANT_STORAGE_KEY) || "control";
}

function detectSource(): string {
  if (typeof window === "undefined") return "direct";

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  if (utmSource) return utmSource.toLowerCase();

  if (!document.referrer) return "direct";

  try {
    const ref = new URL(document.referrer);
    if (ref.host === window.location.host) return "internal";
    return ref.host.toLowerCase();
  } catch {
    return "direct";
  }
}

interface EventData {
  event: string;
  timestamp: string;
  request_id: string;
  [key: string]: unknown;
}

/**
 * Log analytics and forward browser events to the BFF tracking endpoint.
 */
export function logEvent(event: string, properties?: Record<string, unknown>): void {
  const requestId = generateRequestId();
  const data: EventData = {
    event,
    timestamp: new Date().toISOString(),
    request_id: requestId,
    ...properties,
  };

  console.log(JSON.stringify(data));

  if (typeof window === "undefined") return;

  const sessionId = ensureAnalyticsSessionId();
  if (!sessionId) return;

  const payload = {
    event,
    session_id: sessionId,
    variant: detectVariant(),
    source: detectSource(),
    device: detectDeviceType(),
    path: window.location.pathname,
    request_id: requestId,
    occurred_at: new Date().toISOString(),
    properties,
  };

  void fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    cache: "no-store",
  }).catch(() => {
    // Avoid throwing from UI actions due to telemetry failures.
  });
}

/**
 * Analytics interface for future extensibility.
 */
export interface Analytics {
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(name?: string, properties?: Record<string, unknown>): void;
}

export const analytics: Analytics = {
  track: logEvent,
  identify: (userId: string, traits?: Record<string, unknown>) => {
    logEvent("identify", { user_id: userId, ...traits });
  },
  page: (name?: string, properties?: Record<string, unknown>) => {
    logEvent("page_view", { page_name: name, ...properties });
  },
};

export const EVENTS = {
  HOME_VIEW: "home_view",
  HOME_CTA_CLICK: "home_cta_click",
  VIEW_CALCULATOR: "calculator_viewed",
  CALCULATE_SUBMITTED: "calculator_submitted",
  SAVE_CLICKED: "calculator_save_clicked",
  FULL_REPORT_REQUESTED: "calculator_full_report_requested",
  LEAD_CAPTURE_SUBMITTED: "calculator_lead_capture_submitted",
  FULL_REPORT_UNLOCKED: "calculator_full_report_unlocked",
  AUTH_MODAL_OPENED: "auth_modal_opened",
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN_STARTED: "login_started",
  LOGIN_COMPLETED: "login_completed",
  FIRST_SNAPSHOT_SAVED: "first_snapshot_saved",
  PROPERTY_SAVED: "property_saved",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
