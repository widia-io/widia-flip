import { z } from "zod";

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.string()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const ListWorkspacesResponseSchema = z.object({
  items: z.array(WorkspaceSchema),
});
export type ListWorkspacesResponse = z.infer<typeof ListWorkspacesResponseSchema>;

export const CreateWorkspaceRequestSchema = z.object({
  name: z.string().min(1),
});
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

export const WorkspaceSettingsSchema = z.object({
  workspace_id: z.string(),
  pj_tax_rate: z.number(),
  updated_at: z.string(),
});
export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;

// M1 - Prospects

export const ProspectStatusEnum = z.enum(["active", "discarded", "converted"]);
export type ProspectStatus = z.infer<typeof ProspectStatusEnum>;

export const ProspectSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  status: ProspectStatusEnum,
  link: z.string().nullable(),
  neighborhood: z.string().nullable(),
  address: z.string().nullable(),
  area_usable: z.number().nullable(),
  bedrooms: z.number().nullable(),
  suites: z.number().nullable(),
  bathrooms: z.number().nullable(),
  gas: z.string().nullable(),
  floor: z.number().nullable(),
  elevator: z.boolean().nullable(),
  face: z.string().nullable(),
  parking: z.number().nullable(),
  condo_fee: z.number().nullable(),
  asking_price: z.number().nullable(),
  agency: z.string().nullable(),
  broker_name: z.string().nullable(),
  broker_phone: z.string().nullable(),
  comments: z.string().nullable(),
  tags: z.array(z.string()),
  price_per_sqm: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Prospect = z.infer<typeof ProspectSchema>;

export const ListProspectsResponseSchema = z.object({
  items: z.array(ProspectSchema),
  next_cursor: z.string().nullable().optional(),
});
export type ListProspectsResponse = z.infer<typeof ListProspectsResponseSchema>;

export const CreateProspectRequestSchema = z.object({
  workspace_id: z.string().min(1),
  link: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  area_usable: z.number().positive().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  suites: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  gas: z.string().optional(),
  floor: z.number().int().optional(),
  elevator: z.boolean().optional(),
  face: z.string().optional(),
  parking: z.number().int().nonnegative().optional(),
  condo_fee: z.number().nonnegative().optional(),
  asking_price: z.number().nonnegative().optional(),
  agency: z.string().optional(),
  broker_name: z.string().optional(),
  broker_phone: z.string().optional(),
  comments: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateProspectRequest = z.infer<typeof CreateProspectRequestSchema>;

export const UpdateProspectRequestSchema = z.object({
  status: ProspectStatusEnum.optional(),
  link: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  area_usable: z.number().positive().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  suites: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  gas: z.string().optional(),
  floor: z.number().int().optional(),
  elevator: z.boolean().optional(),
  face: z.string().optional(),
  parking: z.number().int().nonnegative().optional(),
  condo_fee: z.number().nonnegative().optional(),
  asking_price: z.number().nonnegative().optional(),
  agency: z.string().optional(),
  broker_name: z.string().optional(),
  broker_phone: z.string().optional(),
  comments: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateProspectRequest = z.infer<typeof UpdateProspectRequestSchema>;

export const ConvertProspectResponseSchema = z.object({
  property_id: z.string(),
});
export type ConvertProspectResponse = z.infer<typeof ConvertProspectResponseSchema>;

// M2 - Properties

export const PropertyStatusEnum = z.enum([
  "prospecting",
  "analyzing",
  "bought",
  "renovation",
  "for_sale",
  "sold",
  "archived",
]);
export type PropertyStatus = z.infer<typeof PropertyStatusEnum>;

export const PropertySchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  origin_prospect_id: z.string().nullable(),
  status_pipeline: PropertyStatusEnum,
  neighborhood: z.string().nullable(),
  address: z.string().nullable(),
  area_usable: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Property = z.infer<typeof PropertySchema>;

export const ListPropertiesResponseSchema = z.object({
  items: z.array(PropertySchema),
  next_cursor: z.string().nullable().optional(),
});
export type ListPropertiesResponse = z.infer<typeof ListPropertiesResponseSchema>;

export const CreatePropertyRequestSchema = z.object({
  workspace_id: z.string().min(1),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  area_usable: z.number().positive().optional(),
  status_pipeline: PropertyStatusEnum.optional(),
});
export type CreatePropertyRequest = z.infer<typeof CreatePropertyRequestSchema>;

export const UpdatePropertyRequestSchema = z.object({
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  area_usable: z.number().positive().optional(),
});
export type UpdatePropertyRequest = z.infer<typeof UpdatePropertyRequestSchema>;

export const UpdatePropertyStatusRequestSchema = z.object({
  status_pipeline: PropertyStatusEnum,
});
export type UpdatePropertyStatusRequest = z.infer<typeof UpdatePropertyStatusRequestSchema>;

// M2 - Cash Analysis

export const CashInputsSchema = z.object({
  purchase_price: z.number().nullable(),
  renovation_cost: z.number().nullable(),
  other_costs: z.number().nullable(),
  sale_price: z.number().nullable(),
});
export type CashInputs = z.infer<typeof CashInputsSchema>;

export const CashOutputsSchema = z.object({
  itbi_value: z.number(),
  registry_value: z.number(),
  acquisition_cost: z.number(),
  investment_total: z.number(),
  broker_fee: z.number(),
  gross_profit: z.number(),
  pj_tax_value: z.number(),
  net_profit: z.number(),
  roi: z.number(),
  is_partial: z.boolean(),
});
export type CashOutputs = z.infer<typeof CashOutputsSchema>;

export const CashAnalysisResponseSchema = z.object({
  inputs: CashInputsSchema,
  outputs: CashOutputsSchema,
});
export type CashAnalysisResponse = z.infer<typeof CashAnalysisResponseSchema>;

export const UpdateCashInputsRequestSchema = z.object({
  purchase_price: z.number().nonnegative().optional(),
  renovation_cost: z.number().nonnegative().optional(),
  other_costs: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
});
export type UpdateCashInputsRequest = z.infer<typeof UpdateCashInputsRequestSchema>;

export const CashSnapshotSchema = z.object({
  id: z.string(),
  inputs: CashInputsSchema,
  outputs: CashOutputsSchema,
  created_at: z.string(),
});
export type CashSnapshot = z.infer<typeof CashSnapshotSchema>;

export const ListCashSnapshotsResponseSchema = z.object({
  items: z.array(CashSnapshotSchema),
});
export type ListCashSnapshotsResponse = z.infer<typeof ListCashSnapshotsResponseSchema>;

export const CreateSnapshotResponseSchema = z.object({
  snapshot_id: z.string(),
  created_at: z.string(),
});
export type CreateSnapshotResponse = z.infer<typeof CreateSnapshotResponseSchema>;

// M3 - Financing Analysis

export const FinancingInputsSchema = z.object({
  purchase_price: z.number().nullable(),
  sale_price: z.number().nullable(),
  down_payment_percent: z.number().nullable(),
  down_payment_value: z.number().nullable(),
  financed_value: z.number().nullable(),
  term_months: z.number().nullable(),
  cet: z.number().nullable(),
  interest_rate: z.number().nullable(),
  insurance: z.number().nullable(),
  appraisal_fee: z.number().nullable(),
  other_fees: z.number().nullable(),
  remaining_debt: z.number().nullable(),
});
export type FinancingInputs = z.infer<typeof FinancingInputsSchema>;

export const FinancingOutputsSchema = z.object({
  down_payment_value: z.number(),
  financed_value: z.number(),
  payments_total: z.number(),
  bank_fees_total: z.number(),
  itbi_value: z.number(),
  registry_value: z.number(),
  acquisition_fees: z.number(),
  total_paid: z.number(),
  investment_total: z.number(),
  broker_fee: z.number(),
  gross_profit: z.number(),
  pj_tax_value: z.number(),
  net_profit: z.number(),
  roi: z.number(),
  interest_paid_estimate: z.number(),
  is_partial: z.boolean(),
});
export type FinancingOutputs = z.infer<typeof FinancingOutputsSchema>;

export const FinancingPaymentSchema = z.object({
  id: z.string(),
  month_index: z.number(),
  amount: z.number(),
  created_at: z.string(),
});
export type FinancingPayment = z.infer<typeof FinancingPaymentSchema>;

export const FinancingAnalysisResponseSchema = z.object({
  plan_id: z.string().optional(),
  inputs: FinancingInputsSchema,
  payments: z.array(FinancingPaymentSchema),
  outputs: FinancingOutputsSchema,
});
export type FinancingAnalysisResponse = z.infer<typeof FinancingAnalysisResponseSchema>;

export const UpdateFinancingInputsRequestSchema = z.object({
  purchase_price: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  down_payment_percent: z.number().min(0).max(1).optional(),
  down_payment_value: z.number().nonnegative().optional(),
  term_months: z.number().int().nonnegative().optional(),
  cet: z.number().nonnegative().optional(),
  interest_rate: z.number().nonnegative().optional(),
  insurance: z.number().nonnegative().optional(),
  appraisal_fee: z.number().nonnegative().optional(),
  other_fees: z.number().nonnegative().optional(),
  remaining_debt: z.number().nonnegative().optional(),
});
export type UpdateFinancingInputsRequest = z.infer<typeof UpdateFinancingInputsRequestSchema>;

export const CreatePaymentRequestSchema = z.object({
  month_index: z.number().int().positive(),
  amount: z.number().nonnegative(),
});
export type CreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;

export const ListPaymentsResponseSchema = z.object({
  items: z.array(FinancingPaymentSchema),
  total: z.number(),
});
export type ListPaymentsResponse = z.infer<typeof ListPaymentsResponseSchema>;

export const FinancingSnapshotSchema = z.object({
  id: z.string(),
  inputs: FinancingInputsSchema,
  payments: z.array(FinancingPaymentSchema),
  outputs: FinancingOutputsSchema,
  created_at: z.string(),
});
export type FinancingSnapshot = z.infer<typeof FinancingSnapshotSchema>;

export const ListFinancingSnapshotsResponseSchema = z.object({
  items: z.array(FinancingSnapshotSchema),
});
export type ListFinancingSnapshotsResponse = z.infer<typeof ListFinancingSnapshotsResponseSchema>;

// M2/M3 - Timeline

export const TimelineEventTypeEnum = z.enum([
  "status_changed",
  "analysis_cash_saved",
  "analysis_financing_saved",
]);
export type TimelineEventType = z.infer<typeof TimelineEventTypeEnum>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  workspace_id: z.string(),
  event_type: z.string(),
  payload: z.record(z.unknown()).nullable().optional(),
  actor_user_id: z.string().nullable().optional(),
  created_at: z.string(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const ListTimelineResponseSchema = z.object({
  items: z.array(TimelineEventSchema),
});
export type ListTimelineResponse = z.infer<typeof ListTimelineResponseSchema>;

