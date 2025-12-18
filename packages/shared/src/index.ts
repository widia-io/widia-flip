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


