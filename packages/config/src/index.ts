import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("postgresql://ari:ari@localhost:5432/ari"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  RENTCAST_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  S3_BUCKET: z.string().default("ari-local-documents")
});

export type Env = z.infer<typeof EnvSchema>;

export function loadConfig(env = process.env): Env {
  return EnvSchema.parse(env);
}
