import { z } from "zod";

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
  S3_BUCKET: z.string().default("ari-local-documents"),
  OPENAI_API_KEY: z.string().optional(),
  TEMPORAL_ADDRESS: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  FEATURE_FLAGS_MODE: z.enum(["local", "statsig", "launchdarkly"]).default("local"),
  ENABLE_LOCAL_AUTH_FALLBACK: z.coerce.boolean().default(true),
  ENCRYPTION_KEY: z.string().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export function loadConfig(env = process.env): Env {
  return EnvSchema.parse(env);
}
