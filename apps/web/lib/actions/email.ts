"use server";

import {
  ListEmailCampaignsResponseSchema,
  EligibleRecipientsResponseSchema,
  EmailCampaignSchema,
  QueueCampaignResponseSchema,
  SendBatchResponseSchema,
  MarketingConsentStatusResponseSchema,
  type ListEmailCampaignsResponse,
  type EligibleRecipientsResponse,
  type EmailCampaign,
  type QueueCampaignResponse,
  type SendBatchResponse,
  type MarketingConsentStatusResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

// Admin actions

export async function getEligibleRecipientsCount(): Promise<EligibleRecipientsResponse> {
  const data = await apiFetch("/api/v1/admin/email/recipients");
  return EligibleRecipientsResponseSchema.parse(data);
}

export async function listEmailCampaigns(): Promise<ListEmailCampaignsResponse> {
  const data = await apiFetch("/api/v1/admin/email/campaigns");
  return ListEmailCampaignsResponseSchema.parse(data);
}

export async function getEmailCampaign(id: string): Promise<EmailCampaign> {
  const data = await apiFetch(`/api/v1/admin/email/campaigns/${id}`);
  return EmailCampaignSchema.parse(data);
}

export async function createEmailCampaign(
  subject: string,
  bodyHtml: string
): Promise<EmailCampaign> {
  const data = await apiFetch("/api/v1/admin/email/campaigns", {
    method: "POST",
    body: JSON.stringify({ subject, bodyHtml }),
  });
  return EmailCampaignSchema.parse(data);
}

export async function queueCampaign(id: string): Promise<QueueCampaignResponse> {
  const data = await apiFetch(`/api/v1/admin/email/campaigns/${id}/queue`, {
    method: "POST",
  });
  return QueueCampaignResponseSchema.parse(data);
}

export async function sendCampaignBatch(id: string): Promise<SendBatchResponse> {
  const data = await apiFetch(`/api/v1/admin/email/campaigns/${id}/send`, {
    method: "POST",
  });
  return SendBatchResponseSchema.parse(data);
}

// User consent actions

export async function getMarketingConsentStatus(): Promise<MarketingConsentStatusResponse> {
  const data = await apiFetch("/api/v1/user/marketing-consent/status");
  return MarketingConsentStatusResponseSchema.parse(data);
}

export async function updateMarketingConsent(accepted: boolean): Promise<void> {
  await apiFetch("/api/v1/user/marketing-consent", {
    method: "PUT",
    body: JSON.stringify({ accepted }),
  });
}
