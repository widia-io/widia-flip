import { z } from "zod";

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.string()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const WorkspaceMembershipRoleEnum = z.enum(["owner", "member"]);
export type WorkspaceMembershipRole = z.infer<typeof WorkspaceMembershipRoleEnum>;

export const WorkspaceMembershipSchema = z.object({
  role: WorkspaceMembershipRoleEnum,
});
export type WorkspaceMembership = z.infer<typeof WorkspaceMembershipSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  membership: WorkspaceMembershipSchema.optional(),
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

export const UpdateWorkspaceRequestSchema = z.object({
  name: z.string().min(1),
});
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>;

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
  iptu: z.number().nullable(),
  asking_price: z.number().nullable(),
  agency: z.string().nullable(),
  broker_name: z.string().nullable(),
  broker_phone: z.string().nullable(),
  comments: z.string().nullable(),
  tags: z.array(z.string()),
  price_per_sqm: z.number().nullable(),
  // M8 - Flip Score fields
  listing_text: z.string().nullable().optional(),
  flip_score: z.number().int().min(0).max(100).nullable().optional(),
  flip_score_version: z.string().nullable().optional(),
  flip_score_confidence: z.number().min(0).max(1).nullable().optional(),
  flip_score_breakdown: z.any().nullable().optional(), // FlipScoreBreakdownSchema or FlipScoreBreakdownV1Schema
  flip_score_updated_at: z.string().nullable().optional(),
  // M9 - Flip Score v1 investment inputs
  offer_price: z.number().nullable().optional(),
  expected_sale_price: z.number().nullable().optional(),
  renovation_cost_estimate: z.number().nullable().optional(),
  hold_months: z.number().int().nullable().optional(),
  other_costs_estimate: z.number().nullable().optional(),
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
  iptu: z.number().nonnegative().optional(),
  asking_price: z.number().nonnegative().optional(),
  agency: z.string().optional(),
  broker_name: z.string().optional(),
  broker_phone: z.string().optional(),
  comments: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // M9 - Flip Score v1 inputs
  offer_price: z.number().nonnegative().optional(),
  expected_sale_price: z.number().nonnegative().optional(),
  renovation_cost_estimate: z.number().nonnegative().optional(),
  hold_months: z.number().int().positive().optional(),
  other_costs_estimate: z.number().nonnegative().optional(),
  // URL import tracking
  imported_via_url: z.boolean().optional(),
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
  iptu: z.number().nonnegative().optional(),
  asking_price: z.number().nonnegative().optional(),
  agency: z.string().optional(),
  broker_name: z.string().optional(),
  broker_phone: z.string().optional(),
  comments: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // M9 - Flip Score v1 inputs
  offer_price: z.number().nonnegative().optional(),
  expected_sale_price: z.number().nonnegative().optional(),
  renovation_cost_estimate: z.number().nonnegative().optional(),
  hold_months: z.number().int().positive().optional(),
  other_costs_estimate: z.number().nonnegative().optional(),
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

export const EffectiveRatesSchema = z.object({
  itbi_rate: z.number(),
  registry_rate: z.number(),
  broker_rate: z.number(),
  pj_tax_rate: z.number(),
});
export type EffectiveRates = z.infer<typeof EffectiveRatesSchema>;

export const CashAnalysisResponseSchema = z.object({
  inputs: CashInputsSchema,
  outputs: CashOutputsSchema,
  effective_rates: EffectiveRatesSchema,
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
  effective_rates: EffectiveRatesSchema.optional(),
  status_pipeline: PropertyStatusEnum.optional(),
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
  effective_rates: EffectiveRatesSchema,
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
  effective_rates: EffectiveRatesSchema.optional(),
  status_pipeline: PropertyStatusEnum.optional(),
  created_at: z.string(),
});
export type FinancingSnapshot = z.infer<typeof FinancingSnapshotSchema>;

export const ListFinancingSnapshotsResponseSchema = z.object({
  items: z.array(FinancingSnapshotSchema),
});
export type ListFinancingSnapshotsResponse = z.infer<typeof ListFinancingSnapshotsResponseSchema>;

// M2/M3/M4 - Timeline

export const TimelineEventTypeEnum = z.enum([
  "status_changed",
  "analysis_cash_saved",
  "analysis_financing_saved",
  "cost_added",
  "cost_updated",
  "doc_uploaded",
  "schedule_item_created",
  "schedule_item_completed",
  "schedule_item_updated",
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

// M4 - Costs

export const CostTypeEnum = z.enum(["renovation", "legal", "tax", "other"]);
export type CostType = z.infer<typeof CostTypeEnum>;

export const CostStatusEnum = z.enum(["planned", "paid"]);
export type CostStatus = z.infer<typeof CostStatusEnum>;

export const CostItemSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  workspace_id: z.string(),
  cost_type: CostTypeEnum,
  category: z.string().nullable(),
  status: CostStatusEnum,
  amount: z.number(),
  due_date: z.string().nullable(),
  vendor: z.string().nullable(),
  notes: z.string().nullable(),
  schedule_item_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CostItem = z.infer<typeof CostItemSchema>;

export const ListCostsResponseSchema = z.object({
  items: z.array(CostItemSchema),
  total_planned: z.number(),
  total_paid: z.number(),
});
export type ListCostsResponse = z.infer<typeof ListCostsResponseSchema>;

export const CreateCostRequestSchema = z.object({
  cost_type: CostTypeEnum,
  category: z.string().optional(),
  status: CostStatusEnum.optional(),
  amount: z.number().nonnegative(),
  due_date: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateCostRequest = z.infer<typeof CreateCostRequestSchema>;

export const UpdateCostRequestSchema = z.object({
  cost_type: CostTypeEnum.optional(),
  category: z.string().optional(),
  status: CostStatusEnum.optional(),
  amount: z.number().nonnegative().optional(),
  due_date: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});
export type UpdateCostRequest = z.infer<typeof UpdateCostRequestSchema>;

// Schedule (Cronograma da Obra)

export const ScheduleCategoryEnum = z.enum([
  "demolition",
  "structural",
  "electrical",
  "plumbing",
  "flooring",
  "painting",
  "finishing",
  "cleaning",
  "other",
]);
export type ScheduleCategory = z.infer<typeof ScheduleCategoryEnum>;

export const SCHEDULE_CATEGORY_LABELS: Record<ScheduleCategory, string> = {
  demolition: "Demolição",
  structural: "Estrutural",
  electrical: "Elétrica",
  plumbing: "Hidráulica",
  flooring: "Piso",
  painting: "Pintura",
  finishing: "Acabamento",
  cleaning: "Limpeza",
  other: "Outro",
};

export const ScheduleItemSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  workspace_id: z.string(),
  title: z.string(),
  planned_date: z.string(),
  done_at: z.string().nullable(),
  notes: z.string().nullable(),
  order_index: z.number().nullable(),
  category: z.string().nullable(),
  estimated_cost: z.number().nullable(),
  linked_cost_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

export const ScheduleSummarySchema = z.object({
  total_items: z.number(),
  completed_items: z.number(),
  overdue_items: z.number(),
  upcoming_7_days: z.number(),
  progress_percent: z.number(),
  estimated_total: z.number(),
  completed_estimated: z.number(),
});
export type ScheduleSummary = z.infer<typeof ScheduleSummarySchema>;

export const ListScheduleResponseSchema = z.object({
  items: z.array(ScheduleItemSchema),
  summary: ScheduleSummarySchema,
});
export type ListScheduleResponse = z.infer<typeof ListScheduleResponseSchema>;

// Workspace-level schedule (centralized view)
export const WorkspaceScheduleItemSchema = ScheduleItemSchema.extend({
  property_name: z.string(),
  property_address: z.string().nullable(),
});
export type WorkspaceScheduleItem = z.infer<typeof WorkspaceScheduleItemSchema>;

export const ListWorkspaceScheduleResponseSchema = z.object({
  items: z.array(WorkspaceScheduleItemSchema),
  summary: ScheduleSummarySchema,
});
export type ListWorkspaceScheduleResponse = z.infer<typeof ListWorkspaceScheduleResponseSchema>;

export const CreateScheduleItemRequestSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
  notes: z.string().optional(),
  order_index: z.number().int().optional(),
  category: z.string().optional(),
  estimated_cost: z.number().nonnegative().optional(),
});
export type CreateScheduleItemRequest = z.infer<typeof CreateScheduleItemRequestSchema>;

export const UpdateScheduleItemRequestSchema = z.object({
  title: z.string().min(1).optional(),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  done_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  order_index: z.number().int().nullable().optional(),
  category: z.string().nullable().optional(),
  estimated_cost: z.number().nonnegative().nullable().optional(),
});
export type UpdateScheduleItemRequest = z.infer<typeof UpdateScheduleItemRequestSchema>;

// M4 - Documents

export const DocumentSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  property_id: z.string().nullable(),
  cost_item_id: z.string().nullable(),
  supplier_id: z.string().nullable(),
  storage_key: z.string(),
  storage_provider: z.string(),
  filename: z.string(),
  content_type: z.string().nullable(),
  size_bytes: z.number().nullable(),
  tags: z.array(z.string()),
  created_at: z.string(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const ListDocumentsResponseSchema = z.object({
  items: z.array(DocumentSchema),
});
export type ListDocumentsResponse = z.infer<typeof ListDocumentsResponseSchema>;

export const GetUploadUrlRequestSchema = z.object({
  workspace_id: z.string(),
  property_id: z.string().optional(),
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number().max(50 * 1024 * 1024),
});
export type GetUploadUrlRequest = z.infer<typeof GetUploadUrlRequestSchema>;

export const GetUploadUrlResponseSchema = z.object({
  upload_url: z.string(),
  storage_key: z.string(),
});
export type GetUploadUrlResponse = z.infer<typeof GetUploadUrlResponseSchema>;

export const RegisterDocumentRequestSchema = z.object({
  workspace_id: z.string(),
  property_id: z.string().optional(),
  cost_item_id: z.string().optional(),
  supplier_id: z.string().optional(),
  storage_key: z.string(),
  filename: z.string(),
  content_type: z.string().optional(),
  size_bytes: z.number().optional(),
  tags: z.array(z.string()).optional(),
});
export type RegisterDocumentRequest = z.infer<typeof RegisterDocumentRequestSchema>;

// Suppliers (Fornecedores)

export const SupplierCategoryEnum = z.enum([
  "pintura",
  "eletrica",
  "hidraulica",
  "arquitetura",
  "engenharia",
  "marcenaria",
  "gesso",
  "piso",
  "serralheria",
  "limpeza",
  "corretor",
  "advogado",
  "despachante",
  "outro",
]);
export type SupplierCategory = z.infer<typeof SupplierCategoryEnum>;

export const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  pintura: "Pintura",
  eletrica: "Elétrica",
  hidraulica: "Hidráulica",
  arquitetura: "Arquitetura",
  engenharia: "Engenharia",
  marcenaria: "Marcenaria",
  gesso: "Gesso",
  piso: "Piso",
  serralheria: "Serralheria",
  limpeza: "Limpeza",
  corretor: "Corretor",
  advogado: "Advogado",
  despachante: "Despachante",
  outro: "Outro",
};

export const SupplierSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  category: SupplierCategoryEnum,
  notes: z.string().nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  hourly_rate: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

export const ListSuppliersResponseSchema = z.object({
  items: z.array(SupplierSchema),
});
export type ListSuppliersResponse = z.infer<typeof ListSuppliersResponseSchema>;

export const CreateSupplierRequestSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  category: SupplierCategoryEnum,
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  hourly_rate: z.number().nonnegative().optional(),
});
export type CreateSupplierRequest = z.infer<typeof CreateSupplierRequestSchema>;

export const UpdateSupplierRequestSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  category: SupplierCategoryEnum.optional(),
  notes: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  hourly_rate: z.number().nonnegative().nullable().optional(),
});
export type UpdateSupplierRequest = z.infer<typeof UpdateSupplierRequestSchema>;

// M5 - Public Calculator

export const PublicCashSettingsSchema = z.object({
  itbi_rate: z.number().min(0).max(1).optional(),
  registry_rate: z.number().min(0).max(1).optional(),
  broker_rate: z.number().min(0).max(1).optional(),
  pj_tax_rate: z.number().min(0).max(1).optional(),
});
export type PublicCashSettings = z.infer<typeof PublicCashSettingsSchema>;

export const PublicCashCalcRequestSchema = z.object({
  purchase_price: z.number().nonnegative().optional(),
  renovation_cost: z.number().nonnegative().optional(),
  other_costs: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  settings: PublicCashSettingsSchema.optional(),
});
export type PublicCashCalcRequest = z.infer<typeof PublicCashCalcRequestSchema>;

export const PublicCashCalcResponseSchema = z.object({
  inputs: z.object({
    purchase_price: z.number().nullable(),
    renovation_cost: z.number().nullable(),
    other_costs: z.number().nullable(),
    sale_price: z.number().nullable(),
  }),
  outputs: CashOutputsSchema,
});
export type PublicCashCalcResponse = z.infer<typeof PublicCashCalcResponseSchema>;

export const SaveCalculatorRequestSchema = z.object({
  purchase_price: z.number().nonnegative().optional(),
  renovation_cost: z.number().nonnegative().optional(),
  other_costs: z.number().nonnegative().optional(),
  sale_price: z.number().nonnegative().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
});
export type SaveCalculatorRequest = z.infer<typeof SaveCalculatorRequestSchema>;

export const SaveCalculatorResponseSchema = z.object({
  property_id: z.string(),
  snapshot_id: z.string(),
});
export type SaveCalculatorResponse = z.infer<typeof SaveCalculatorResponseSchema>;

// URL Scraper - Extração de dados de imóveis via URL

export const ScrapePropertyRequestSchema = z.object({
  url: z.string().url("URL inválida"),
  workspace_id: z.string().uuid("workspace_id inválido"),
});
export type ScrapePropertyRequest = z.infer<typeof ScrapePropertyRequestSchema>;

export const ScrapedPropertySchema = z.object({
  neighborhood: z.string().nullable(),
  address: z.string().nullable(),
  area_usable: z.number().nullable(),
  bedrooms: z.number().nullable(),
  suites: z.number().nullable(),
  bathrooms: z.number().nullable(),
  parking: z.number().nullable(),
  floor: z.number().nullable(),
  asking_price: z.number().nullable(),
  condo_fee: z.number().nullable(),
  iptu: z.number().nullable(),
  agency: z.string().nullable(),
  broker_name: z.string().nullable(),
});
export type ScrapedProperty = z.infer<typeof ScrapedPropertySchema>;

export const ScrapePropertyResponseSchema = z.object({
  success: z.boolean(),
  data: ScrapedPropertySchema.optional(),
  warning: z.string().optional(),
});
export type ScrapePropertyResponse = z.infer<typeof ScrapePropertyResponseSchema>;

// M8 - Flip Score

export const RedFlagCategoryEnum = z.enum([
  "legal",
  "structural",
  "moisture",
  "condo_rules",
  "security",
  "noise",
  "access",
  "listing_inconsistency",
]);
export type RedFlagCategory = z.infer<typeof RedFlagCategoryEnum>;

export const RedFlagSchema = z.object({
  category: RedFlagCategoryEnum,
  severity: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
});
export type RedFlag = z.infer<typeof RedFlagSchema>;

export const RehabLevelEnum = z.enum(["light", "medium", "heavy"]);
export type RehabLevel = z.infer<typeof RehabLevelEnum>;

export const FlipRiskAssessmentSchema = z.object({
  rehab_level: RehabLevelEnum.nullable(),
  llm_confidence: z.number().min(0).max(1),
  red_flags: z.array(RedFlagSchema),
  missing_critical: z.array(z.string()),
});
export type FlipRiskAssessment = z.infer<typeof FlipRiskAssessmentSchema>;

export const CohortScopeEnum = z.enum(["neighborhood", "workspace"]);
export type CohortScope = z.infer<typeof CohortScopeEnum>;

export const FlipScoreComponentsSchema = z.object({
  s_price: z.number(),
  s_carry: z.number(),
  s_liquidity: z.number(),
  s_risk: z.number(),
  s_data: z.number(),
});
export type FlipScoreComponents = z.infer<typeof FlipScoreComponentsSchema>;

export const FlipScoreIntermediateSchema = z.object({
  price_per_sqm: z.number().nullable(),
  carry_ratio: z.number().nullable(),
  cohort_n: z.number(),
  cohort_scope: CohortScopeEnum,
});
export type FlipScoreIntermediate = z.infer<typeof FlipScoreIntermediateSchema>;

export const FlipScoreMultipliersSchema = z.object({
  m_data: z.number(),
  m_llm: z.number(),
});
export type FlipScoreMultipliers = z.infer<typeof FlipScoreMultipliersSchema>;

export const FlipScoreBreakdownSchema = z.object({
  components: FlipScoreComponentsSchema,
  intermediate: FlipScoreIntermediateSchema,
  risk_assessment: FlipRiskAssessmentSchema.nullable(),
  missing_fields: z.array(z.string()),
  multipliers: FlipScoreMultipliersSchema,
  raw_score: z.number(),
});
export type FlipScoreBreakdown = z.infer<typeof FlipScoreBreakdownSchema>;

// M9 - Flip Score v1 (Economics-based)

export const EconomicsBreakdownSchema = z.object({
  roi: z.number(),
  net_profit: z.number(),
  gross_profit: z.number(),
  investment_total: z.number(),
  broker_fee: z.number(),
  pj_tax_value: z.number(),
  break_even_sale_price: z.number(),
  buffer: z.number(),
  is_partial: z.boolean(),
});
export type EconomicsBreakdown = z.infer<typeof EconomicsBreakdownSchema>;

export const FlipScoreComponentsV1Schema = z.object({
  s_econ: z.number(),
  s_liquidity: z.number(),
  s_risk: z.number(),
  s_data: z.number(),
});
export type FlipScoreComponentsV1 = z.infer<typeof FlipScoreComponentsV1Schema>;

export const FlipScoreBreakdownV1Schema = z.object({
  components: FlipScoreComponentsV1Schema,
  economics: EconomicsBreakdownSchema.nullable(),
  intermediate: FlipScoreIntermediateSchema,
  risk_assessment: FlipRiskAssessmentSchema.nullable(),
  missing_fields: z.array(z.string()),
  multipliers: FlipScoreMultipliersSchema,
  raw_score: z.number(),
});
export type FlipScoreBreakdownV1 = z.infer<typeof FlipScoreBreakdownV1Schema>;

export const RecomputeFlipScoreRequestSchema = z.object({
  force: z.boolean().optional(),
});
export type RecomputeFlipScoreRequest = z.infer<typeof RecomputeFlipScoreRequestSchema>;

export const RecomputeFlipScoreResponseSchema = z.object({
  prospect: z.object({
    id: z.string(),
    flip_score: z.number().int().min(0).max(100).nullable(),
    flip_score_version: z.string().nullable(),
    flip_score_confidence: z.number().min(0).max(1).nullable(),
    flip_score_breakdown: FlipScoreBreakdownSchema.nullable(),
    flip_score_updated_at: z.string().nullable(),
  }),
});
export type RecomputeFlipScoreResponse = z.infer<typeof RecomputeFlipScoreResponseSchema>;

// M10 - Billing & Entitlements

export const BillingTierEnum = z.enum(["starter", "pro", "growth"]);
export type BillingTier = z.infer<typeof BillingTierEnum>;

export const BillingStatusEnum = z.enum([
  "active",
  "trialing",
  "canceled",
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
]);
export type BillingStatus = z.infer<typeof BillingStatusEnum>;

export const BillingIntervalEnum = z.enum(["monthly", "yearly"]);
export type BillingInterval = z.infer<typeof BillingIntervalEnum>;

export const TierLimitsSchema = z.object({
  max_workspaces: z.number(),
  max_prospects_per_month: z.number(),
  max_snapshots_per_month: z.number(),
  max_docs_per_month: z.number(),
  max_url_imports_per_month: z.number(),
  max_storage_bytes: z.number(),
  max_suppliers: z.number(), // Total per workspace (not monthly)
});
export type TierLimits = z.infer<typeof TierLimitsSchema>;

export const TIER_LIMITS: Record<BillingTier, TierLimits> = {
  starter: {
    max_workspaces: 1,
    max_prospects_per_month: 50,
    max_snapshots_per_month: 30,
    max_docs_per_month: 5,
    max_url_imports_per_month: 5,
    max_storage_bytes: 100 * 1024 * 1024, // 100MB
    max_suppliers: 10,
  },
  pro: {
    max_workspaces: 3,
    max_prospects_per_month: 300,
    max_snapshots_per_month: 200,
    max_docs_per_month: 50,
    max_url_imports_per_month: 50,
    max_storage_bytes: 2 * 1024 * 1024 * 1024, // 2GB
    max_suppliers: 50,
  },
  growth: {
    max_workspaces: 10,
    max_prospects_per_month: 999999, // Unlimited
    max_snapshots_per_month: 999999, // Unlimited
    max_docs_per_month: 200,
    max_url_imports_per_month: 999999, // Unlimited
    max_storage_bytes: 20 * 1024 * 1024 * 1024, // 20GB
    max_suppliers: 999999, // Unlimited
  },
};

// Prices in BRL (2 meses gratis no anual = 10x mensal)
export const TIER_PRICES: Record<BillingTier, { monthly: number; yearly: number }> = {
  starter: { monthly: 39, yearly: 390 },
  pro: { monthly: 119, yearly: 1190 },
  growth: { monthly: 249, yearly: 2490 },
};

export const UserBillingSchema = z.object({
  user_id: z.string(),
  tier: BillingTierEnum,
  status: BillingStatusEnum,
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  stripe_price_id: z.string().nullable(),
  current_period_start: z.string().nullable(),
  current_period_end: z.string().nullable(),
  trial_end: z.string().nullable(),
  cancel_at_period_end: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type UserBilling = z.infer<typeof UserBillingSchema>;

export const UserEntitlementsSchema = z.object({
  billing: UserBillingSchema,
  limits: TierLimitsSchema,
  is_subscribed: z.boolean(),
  can_access_financing: z.boolean(),
  can_access_flip_score_v1: z.boolean(),
});
export type UserEntitlements = z.infer<typeof UserEntitlementsSchema>;

export const CreateCheckoutRequestSchema = z.object({
  tier: BillingTierEnum,
  interval: BillingIntervalEnum.default("monthly"),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  voucher_code: z.string().optional(),
});
export type CreateCheckoutRequest = z.infer<typeof CreateCheckoutRequestSchema>;

export const CreateCheckoutResponseSchema = z.object({
  checkout_url: z.string(),
  session_id: z.string(),
});
export type CreateCheckoutResponse = z.infer<typeof CreateCheckoutResponseSchema>;

export const CreatePortalRequestSchema = z.object({
  return_url: z.string().url(),
});
export type CreatePortalRequest = z.infer<typeof CreatePortalRequestSchema>;

export const CreatePortalResponseSchema = z.object({
  portal_url: z.string(),
});
export type CreatePortalResponse = z.infer<typeof CreatePortalResponseSchema>;

export const SyncBillingRequestSchema = z.object({
  user_id: z.string(),
  tier: BillingTierEnum,
  status: BillingStatusEnum,
  stripe_customer_id: z.string(),
  stripe_subscription_id: z.string(),
  stripe_price_id: z.string(),
  current_period_start: z.string().nullable(),
  current_period_end: z.string().nullable(),
  trial_end: z.string().nullable(),
  cancel_at_period_end: z.boolean(),
});
export type SyncBillingRequest = z.infer<typeof SyncBillingRequestSchema>;

export const OverrideBillingRequestSchema = z.object({
  user_id: z.string(),
  tier: BillingTierEnum,
});
export type OverrideBillingRequest = z.infer<typeof OverrideBillingRequestSchema>;

// M11 - Usage Tracking

export const UsageMetricSchema = z.object({
  metric: z.string(),
  usage: z.number(),
  limit: z.number(),
  at_80_percent: z.boolean(),
  at_or_over_100: z.boolean(),
});
export type UsageMetric = z.infer<typeof UsageMetricSchema>;

export const UsageMetricsSchema = z.object({
  prospects: UsageMetricSchema,
  snapshots: UsageMetricSchema,
  documents: UsageMetricSchema,
  url_imports: UsageMetricSchema,
  storage_bytes: UsageMetricSchema,
});
export type UsageMetrics = z.infer<typeof UsageMetricsSchema>;

export const PeriodTypeEnum = z.enum(["stripe_cycle", "calendar_month"]);
export type PeriodType = z.infer<typeof PeriodTypeEnum>;

export const WorkspaceUsageResponseSchema = z.object({
  workspace_id: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  period_type: PeriodTypeEnum,
  tier: BillingTierEnum,
  metrics: UsageMetricsSchema,
});
export type WorkspaceUsageResponse = z.infer<typeof WorkspaceUsageResponseSchema>;

export const UserUsageResponseSchema = z.object({
  user_id: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  period_type: PeriodTypeEnum,
  tier: BillingTierEnum,
  metrics: UsageMetricsSchema,
});
export type UserUsageResponse = z.infer<typeof UserUsageResponseSchema>;

// M12 - Paywall + Enforcement (Hard Limits)

export const EnforcementErrorCodeEnum = z.enum([
  "PAYWALL_REQUIRED",
  "LIMIT_EXCEEDED",
]);
export type EnforcementErrorCode = z.infer<typeof EnforcementErrorCodeEnum>;

export const EnforcementDetailsSchema = z.object({
  tier: BillingTierEnum,
  metric: z.string().optional(),
  usage: z.number().optional(),
  limit: z.number().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  workspace_limit: z.number().optional(),
  workspaces_used: z.number().optional(),
  billing_status: z.string().optional(),
});
export type EnforcementDetails = z.infer<typeof EnforcementDetailsSchema>;

export const EnforcementErrorSchema = z.object({
  code: EnforcementErrorCodeEnum,
  message: z.string(),
  details: EnforcementDetailsSchema,
});
export type EnforcementError = z.infer<typeof EnforcementErrorSchema>;

export const EnforcementErrorResponseSchema = z.object({
  error: EnforcementErrorSchema,
});
export type EnforcementErrorResponse = z.infer<typeof EnforcementErrorResponseSchema>;

// Helper to detect enforcement errors
export function isEnforcementError(
  error: unknown
): error is EnforcementErrorResponse {
  return EnforcementErrorResponseSchema.safeParse(error).success;
}

// Helper to parse enforcement error from API response text
export function parseEnforcementError(
  text: string
): EnforcementErrorResponse | null {
  try {
    const json = JSON.parse(text);
    const parsed = EnforcementErrorResponseSchema.safeParse(json);
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// User Preferences (Onboarding)

export const OnboardingChecklistSchema = z.object({
  created_workspace: z.boolean(),
  added_prospect: z.boolean(),
  calculated_score: z.boolean(),
  converted_to_property: z.boolean(),
});
export type OnboardingChecklist = z.infer<typeof OnboardingChecklistSchema>;

export const UserPreferencesSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  onboarding_completed: z.boolean(),
  onboarding_checklist: OnboardingChecklistSchema,
  feature_tour_completed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UpdateUserPreferencesRequestSchema = z.object({
  onboarding_completed: z.boolean().optional(),
  onboarding_checklist: OnboardingChecklistSchema.partial().optional(),
  feature_tour_completed: z.boolean().optional(),
});
export type UpdateUserPreferencesRequest = z.infer<typeof UpdateUserPreferencesRequestSchema>;

// Property Tax Rates (Custom per-property)

export const PropertyRatesSchema = z.object({
  itbi_rate: z.number().min(0).max(1).nullable(),
  registry_rate: z.number().min(0).max(1).nullable(),
  broker_rate: z.number().min(0).max(1).nullable(),
  pj_tax_rate: z.number().min(0).max(1).nullable(),
});
export type PropertyRates = z.infer<typeof PropertyRatesSchema>;

export const PropertyRatesResponseSchema = z.object({
  custom: PropertyRatesSchema,
  effective: EffectiveRatesSchema,
  workspace_rates: EffectiveRatesSchema,
  updated_at: z.string().nullable().optional(),
});
export type PropertyRatesResponse = z.infer<typeof PropertyRatesResponseSchema>;

export const UpdatePropertyRatesRequestSchema = z.object({
  itbi_rate: z.number().min(0).max(1).nullable().optional(),
  registry_rate: z.number().min(0).max(1).nullable().optional(),
  broker_rate: z.number().min(0).max(1).nullable().optional(),
  pj_tax_rate: z.number().min(0).max(1).nullable().optional(),
});
export type UpdatePropertyRatesRequest = z.infer<typeof UpdatePropertyRatesRequestSchema>;

// Tax Rate Presets (common regional rates)
export const TAX_RATE_PRESETS = {
  sp_capital: {
    label: "SP Capital",
    itbi_rate: 0.03,
    registry_rate: 0.01,
    broker_rate: 0.06,
  },
  sp_interior: {
    label: "SP Interior",
    itbi_rate: 0.02,
    registry_rate: 0.01,
    broker_rate: 0.06,
  },
  rj: {
    label: "RJ",
    itbi_rate: 0.02,
    registry_rate: 0.01,
    broker_rate: 0.06,
  },
} as const;
export type TaxRatePresetKey = keyof typeof TAX_RATE_PRESETS;

// Unified Snapshots (workspace-wide listing)

export const SnapshotTypeEnum = z.enum(["cash", "financing"]);
export type SnapshotType = z.infer<typeof SnapshotTypeEnum>;

export const UnifiedSnapshotSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  property_name: z.string().nullable(),
  snapshot_type: SnapshotTypeEnum,
  status_pipeline: PropertyStatusEnum.optional(),
  net_profit: z.number(),
  roi: z.number(),
  purchase_price: z.number().nullable(),
  sale_price: z.number().nullable(),
  created_at: z.string(),
  annotation_count: z.number(),
});
export type UnifiedSnapshot = z.infer<typeof UnifiedSnapshotSchema>;

export const ListUnifiedSnapshotsResponseSchema = z.object({
  items: z.array(UnifiedSnapshotSchema),
  total_count: z.number(),
});
export type ListUnifiedSnapshotsResponse = z.infer<typeof ListUnifiedSnapshotsResponseSchema>;

export const ListUnifiedSnapshotsQuerySchema = z.object({
  workspace_id: z.string(),
  snapshot_type: z.enum(["cash", "financing", "all"]).optional(),
  status_pipeline: PropertyStatusEnum.optional(),
  min_roi: z.number().optional(),
  property_search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type ListUnifiedSnapshotsQuery = z.infer<typeof ListUnifiedSnapshotsQuerySchema>;

// Snapshot Annotations

export const SnapshotAnnotationSchema = z.object({
  id: z.string(),
  snapshot_id: z.string(),
  snapshot_type: SnapshotTypeEnum,
  note: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SnapshotAnnotation = z.infer<typeof SnapshotAnnotationSchema>;

export const CreateAnnotationRequestSchema = z.object({
  snapshot_id: z.string(),
  snapshot_type: SnapshotTypeEnum,
  note: z.string().min(1).max(1000),
});
export type CreateAnnotationRequest = z.infer<typeof CreateAnnotationRequestSchema>;

export const UpdateAnnotationRequestSchema = z.object({
  note: z.string().min(1).max(1000),
});
export type UpdateAnnotationRequest = z.infer<typeof UpdateAnnotationRequestSchema>;

export const ListAnnotationsResponseSchema = z.object({
  items: z.array(SnapshotAnnotationSchema),
});
export type ListAnnotationsResponse = z.infer<typeof ListAnnotationsResponseSchema>;

// Snapshot Comparison

export const FullSnapshotSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  property_name: z.string().nullable(),
  snapshot_type: SnapshotTypeEnum,
  status_pipeline: PropertyStatusEnum.optional().nullable(),
  inputs: z.record(z.unknown()),
  outputs: z.record(z.unknown()),
  rates: z.record(z.unknown()).optional(),
  created_at: z.string(),
});
export type FullSnapshot = z.infer<typeof FullSnapshotSchema>;

export const CompareSnapshotsResponseSchema = z.object({
  snapshots: z.array(FullSnapshotSchema),
});
export type CompareSnapshotsResponse = z.infer<typeof CompareSnapshotsResponseSchema>;

// Admin Dashboard

export const AdminUserStatsSchema = z.object({
  total: z.number(),
  byTier: z.record(z.string(), z.number()),
});
export type AdminUserStats = z.infer<typeof AdminUserStatsSchema>;

export const AdminStorageStatsSchema = z.object({
  totalFiles: z.number(),
  totalBytes: z.number(),
});
export type AdminStorageStats = z.infer<typeof AdminStorageStatsSchema>;

export const AdminStatsResponseSchema = z.object({
  users: AdminUserStatsSchema,
  workspaces: z.object({ total: z.number() }),
  properties: z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
  }),
  prospects: z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number()),
  }),
  snapshots: z.object({
    cash: z.number(),
    financing: z.number(),
  }),
  storage: AdminStorageStatsSchema,
});
export type AdminStatsResponse = z.infer<typeof AdminStatsResponseSchema>;

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  isAdmin: z.boolean(),
  isActive: z.boolean(),
  tier: z.string().nullable(),
  billingStatus: z.string().nullable(),
  workspaceCount: z.number(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

export const AdminUserWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
});
export type AdminUserWorkspace = z.infer<typeof AdminUserWorkspaceSchema>;

export const AdminUserDetailSchema = AdminUserSchema.extend({
  workspaces: z.array(AdminUserWorkspaceSchema),
  storage: AdminStorageStatsSchema,
});
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;

export const ListAdminUsersResponseSchema = z.object({
  items: z.array(AdminUserSchema),
  total: z.number(),
});
export type ListAdminUsersResponse = z.infer<typeof ListAdminUsersResponseSchema>;

export const UpdateUserTierRequestSchema = z.object({
  tier: BillingTierEnum,
});
export type UpdateUserTierRequest = z.infer<typeof UpdateUserTierRequestSchema>;

export const UpdateUserStatusRequestSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateUserStatusRequest = z.infer<typeof UpdateUserStatusRequestSchema>;

export const AdminStatusResponseSchema = z.object({
  isAdmin: z.boolean(),
});
export type AdminStatusResponse = z.infer<typeof AdminStatusResponseSchema>;

// Promotions & Vouchers

export const PromotionSchema = z.object({
  id: z.string(),
  name: z.string(),
  bannerText: z.string(),
  bannerEmoji: z.string(),
  stripeCouponId: z.string().nullable(),
  endsAt: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Promotion = z.infer<typeof PromotionSchema>;

export const ActiveBannerSchema = z.object({
  id: z.string(),
  bannerText: z.string(),
  bannerEmoji: z.string(),
  stripeCouponId: z.string().nullable(),
  endsAt: z.string(),
});
export type ActiveBanner = z.infer<typeof ActiveBannerSchema>;

export const ActiveBannerResponseSchema = z.object({
  banner: ActiveBannerSchema.nullable(),
});
export type ActiveBannerResponse = z.infer<typeof ActiveBannerResponseSchema>;

export const CreatePromotionRequestSchema = z.object({
  name: z.string().min(1),
  bannerText: z.string().min(1),
  bannerEmoji: z.string().optional().default("🎉"),
  stripeCouponId: z.string().nullable().optional(),
  endsAt: z.string(), // RFC3339
  isActive: z.boolean().optional().default(false),
});
export type CreatePromotionRequest = z.infer<typeof CreatePromotionRequestSchema>;

export const UpdatePromotionRequestSchema = z.object({
  name: z.string().min(1).optional(),
  bannerText: z.string().min(1).optional(),
  bannerEmoji: z.string().optional(),
  stripeCouponId: z.string().nullable().optional(),
  endsAt: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePromotionRequest = z.infer<typeof UpdatePromotionRequestSchema>;

export const ListPromotionsResponseSchema = z.object({
  items: z.array(PromotionSchema),
});
export type ListPromotionsResponse = z.infer<typeof ListPromotionsResponseSchema>;
