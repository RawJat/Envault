import { z } from "zod";

// Enums matching DB types
export const ComponentStatusEnum = z.enum([
  "operational",
  "degraded",
  "outage",
  "maintenance",
]);
export const IncidentSeverityEnum = z.enum([
  "minor",
  "major",
  "critical",
  "maintenance",
]);
export const IncidentStatusEnum = z.enum([
  "investigating",
  "identified",
  "monitoring",
  "resolved",
]);

// Status Page Schemas
export const CreateComponentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export const UpdateComponentStatusSchema = z.object({
  id: z.string().uuid("Invalid component ID"),
  status: ComponentStatusEnum,
});

export const CreateIncidentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  severity: IncidentSeverityEnum,
  status: IncidentStatusEnum,
  componentIds: z.array(z.string().uuid("Invalid component ID")).default([]),
  initialMessage: z.string().min(1, "Message is required"),
});

export const UpdateIncidentSchema = z.object({
  incidentId: z.string().uuid("Invalid incident ID"),
  status: IncidentStatusEnum,
  message: z.string().min(1, "Message is required"),
});

// Project Schemas
export const ProjectNameSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(50, "Project name too long")
    .regex(/^[a-zA-Z0-9_\-\s]+$/, "Project name contains invalid characters"),
  ui_mode: z.enum(["simple", "advanced"]).optional(),
  default_environment_slug: z
    .enum(["development", "preview", "production"])
    .optional(),
});

// Secret Schemas
export const SecretSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    // Safe chars: Alphanumeric, underscores, hyphens, dots.
    .regex(/^[a-zA-Z0-9_\-\.]+$/, "Invalid key format"),
  value: z
    .string()
    // Value can be anything, but we might want to limit length to prevent DOS
    .max(10000, "Value too large"),
});

export const PushSecretsSchema = z.object({
  secrets: z.array(SecretSchema).min(1, "At least one secret is required"),
});

export const ProjectIdParamSchema = z.object({
  projectId: z.string().uuid("Invalid Project ID"),
});

export type ComponentStatus = z.infer<typeof ComponentStatusEnum>;
export type IncidentSeverity = z.infer<typeof IncidentSeverityEnum>;
export type IncidentStatus = z.infer<typeof IncidentStatusEnum>;

export const UserEmailSchema = z.object({
  userId: z.string().uuid("Invalid User ID"),
});
