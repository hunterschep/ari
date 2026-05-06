import { z } from "zod";

const EnvBooleanSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  return value;
}, z.boolean());

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  CLERK_DEMO_USER_ID: z.string().optional(),
  DATABASE_URL: z.string().default("postgresql://ari:ari@localhost:5432/ari"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  RENTCAST_API_KEY: z.string().optional(),
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  WEBHOOK_SHARED_SECRET: z.string().optional(),
  TWILIO_WEBHOOK_SECRET: z.string().optional(),
  SENDGRID_WEBHOOK_SECRET: z.string().optional(),
  POSTMARK_WEBHOOK_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_WEBHOOK_SECRET: z.string().optional(),
  S3_BUCKET: z.string().default("ari-local-documents"),
  OPENAI_API_KEY: z.string().optional(),
  TEMPORAL_ADDRESS: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  FEATURE_FLAGS_MODE: z.enum(["local", "statsig", "launchdarkly"]).default("local"),
  ENABLE_LOCAL_AUTH_FALLBACK: EnvBooleanSchema.default(false),
  ENCRYPTION_KEY: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function loadConfig(env = process.env): Env {
  return EnvSchema.parse(env);
}

export class ConfigValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Production configuration is not safe to boot: ${issues.join("; ")}`);
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

export function assertProductionReadyConfig(config: Env) {
  if (config.NODE_ENV !== "production") return;

  const issues: string[] = [];
  if (config.ENABLE_LOCAL_AUTH_FALLBACK) {
    issues.push("ENABLE_LOCAL_AUTH_FALLBACK must be false in production");
  }

  requirePresent(issues, "CLERK_SECRET_KEY", config.CLERK_SECRET_KEY);
  requirePresent(issues, "CLERK_WEBHOOK_SECRET", config.CLERK_WEBHOOK_SECRET);
  requirePresent(issues, "RENTCAST_API_KEY", config.RENTCAST_API_KEY);
  requirePresent(issues, "MAPBOX_ACCESS_TOKEN", config.MAPBOX_ACCESS_TOKEN);
  requirePresent(issues, "SENDGRID_API_KEY", config.SENDGRID_API_KEY);
  requirePresent(issues, "TWILIO_ACCOUNT_SID", config.TWILIO_ACCOUNT_SID);
  requirePresent(issues, "TWILIO_AUTH_TOKEN", config.TWILIO_AUTH_TOKEN);
  requirePresent(issues, "GOOGLE_CALENDAR_CLIENT_ID", config.GOOGLE_CALENDAR_CLIENT_ID ?? config.GOOGLE_CLIENT_ID);
  requirePresent(issues, "TEMPORAL_ADDRESS", config.TEMPORAL_ADDRESS);
  requirePresent(issues, "OPENAI_API_KEY", config.OPENAI_API_KEY);
  requirePresent(issues, "ENCRYPTION_KEY", config.ENCRYPTION_KEY);

  const webhookSecretConfigured =
    config.WEBHOOK_SHARED_SECRET ||
    (config.TWILIO_WEBHOOK_SECRET &&
      config.SENDGRID_WEBHOOK_SECRET &&
      config.POSTMARK_WEBHOOK_SECRET &&
      config.GOOGLE_CALENDAR_WEBHOOK_SECRET);
  if (!webhookSecretConfigured) {
    issues.push("WEBHOOK_SHARED_SECRET or all provider-specific webhook secrets must be configured");
  }

  const origins = config.WEB_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (!origins.length || origins.includes("*")) {
    issues.push("WEB_ORIGIN must be an explicit allowlist and cannot include *");
  }

  if (isLocalUrl(config.DATABASE_URL)) {
    issues.push("DATABASE_URL cannot use localhost/default local database in production");
  }
  if (isLocalUrl(config.REDIS_URL)) {
    issues.push("REDIS_URL cannot use localhost/default local Redis in production");
  }
  if (config.S3_BUCKET === "ari-local-documents") {
    issues.push("S3_BUCKET must not use the local demo bucket in production");
  }

  if (issues.length) throw new ConfigValidationError(issues);
}

function requirePresent(issues: string[], key: string, value: string | undefined) {
  if (!value?.trim()) issues.push(`${key} is required in production`);
}

function isLocalUrl(value: string) {
  return /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(value) || value.includes("@localhost:");
}
