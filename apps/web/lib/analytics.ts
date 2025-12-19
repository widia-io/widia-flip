/**
 * Analytics module for funnel events (MVP implementation using logs)
 *
 * Events tracked:
 * - view_calculator: Page load
 * - calculate_submitted: User submitted calculation
 * - save_clicked: User clicked save button
 * - auth_modal_opened: Auth modal was opened
 * - signup_completed: User completed signup
 * - property_saved: Property was created from calculator
 */

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface EventData {
  event: string;
  timestamp: string;
  request_id: string;
  [key: string]: unknown;
}

/**
 * Log an analytics event
 * MVP: Uses console.log with structured JSON
 * V1: Can be swapped for PostHog, Segment, etc.
 */
export function logEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  const data: EventData = {
    event,
    timestamp: new Date().toISOString(),
    request_id: generateRequestId(),
    ...properties,
  };

  // In production, this goes to stdout and can be collected by log aggregators
  console.log(JSON.stringify(data));
}

/**
 * Analytics interface for future extensibility
 * Allows swapping implementations without changing call sites
 */
export interface Analytics {
  track(event: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  page(name?: string, properties?: Record<string, unknown>): void;
}

/**
 * Default analytics implementation using logs
 */
export const analytics: Analytics = {
  track: logEvent,
  identify: (userId: string, traits?: Record<string, unknown>) => {
    logEvent("identify", { user_id: userId, ...traits });
  },
  page: (name?: string, properties?: Record<string, unknown>) => {
    logEvent("page_view", { page_name: name, ...properties });
  },
};

// Event constants for type safety
export const EVENTS = {
  VIEW_CALCULATOR: "view_calculator",
  CALCULATE_SUBMITTED: "calculate_submitted",
  SAVE_CLICKED: "save_clicked",
  AUTH_MODAL_OPENED: "auth_modal_opened",
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN_COMPLETED: "login_completed",
  PROPERTY_SAVED: "property_saved",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
