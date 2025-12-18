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


