import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../../apps/api/src/server";
import { createAriStore } from "../../apps/api/src/store";

describe("api server safety boundaries", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not boot the in-memory demo store in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(buildServer()).rejects.toThrow("Production API cannot boot with the in-memory demo store");
  });

  it("returns public correlation IDs without leaking raw internal errors", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const app = await buildServer({ store: createAriStore(), auth: { allowLocalFallback: true } });

    const response = await app.inject({
      method: "POST",
      url: "/v1/tours/missing-tour/confirm"
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("InternalServerError");
    expect(response.json().message).toBe("Internal server error");
    expect(response.json().requestId).toBeTruthy();
    expect(JSON.stringify(response.json())).not.toContain("Tour not found");

    await app.close();
  });
});
