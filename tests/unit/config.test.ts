import { describe, expect, it } from "vitest";
import { assertProductionReadyConfig, ConfigValidationError, loadConfig } from "@ari/config";

describe("config", () => {
  it("parses explicit boolean env strings without treating false as truthy", () => {
    expect(loadConfig(configEnv("false")).ENABLE_LOCAL_AUTH_FALLBACK).toBe(false);
    expect(loadConfig(configEnv("true")).ENABLE_LOCAL_AUTH_FALLBACK).toBe(true);
  });

  it("fails production config when demo auth, local services, or provider secrets are present/missing", () => {
    const config = loadConfig({
      ...productionEnv(),
      ENABLE_LOCAL_AUTH_FALLBACK: "true",
      DATABASE_URL: "postgresql://ari:ari@localhost:5432/ari",
      REDIS_URL: "redis://127.0.0.1:6379",
      SENDGRID_API_KEY: ""
    });

    expect(() => assertProductionReadyConfig(config)).toThrow(ConfigValidationError);
    try {
      assertProductionReadyConfig(config);
    } catch (error) {
      expect((error as ConfigValidationError).issues).toContain("ENABLE_LOCAL_AUTH_FALLBACK must be false in production");
      expect((error as ConfigValidationError).issues).toContain("SENDGRID_API_KEY is required in production");
      expect((error as ConfigValidationError).issues).toContain("DATABASE_URL cannot use localhost/default local database in production");
      expect((error as ConfigValidationError).issues).toContain("REDIS_URL cannot use localhost/default local Redis in production");
    }
  });

  it("accepts a production config only when required private-alpha dependencies are explicit", () => {
    expect(() => assertProductionReadyConfig(loadConfig(productionEnv()))).not.toThrow();
  });
});

function configEnv(value: string): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ENABLE_LOCAL_AUTH_FALLBACK: value };
}

function productionEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    PORT: "4000",
    WEB_ORIGIN: "https://app.ari.example",
    CLERK_SECRET_KEY: "sk_live_test",
    CLERK_WEBHOOK_SECRET: "whsec_test",
    DATABASE_URL: "postgresql://ari:secret@postgres.internal:5432/ari",
    REDIS_URL: "redis://redis.internal:6379",
    RENTCAST_API_KEY: "rentcast_test",
    MAPBOX_ACCESS_TOKEN: "mapbox_test",
    SENDGRID_API_KEY: "sendgrid_test",
    TWILIO_ACCOUNT_SID: "twilio_sid",
    TWILIO_AUTH_TOKEN: "twilio_token",
    GOOGLE_CALENDAR_CLIENT_ID: "google_calendar_client",
    WEBHOOK_SHARED_SECRET: "shared_webhook_secret",
    S3_BUCKET: "ari-private-alpha-documents",
    OPENAI_API_KEY: "openai_test",
    TEMPORAL_ADDRESS: "temporal.internal:7233",
    ENABLE_LOCAL_AUTH_FALLBACK: "false",
    ENCRYPTION_KEY: "private-alpha-encryption-key"
  };
}
