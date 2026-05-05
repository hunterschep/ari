export class AriError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export class NotFoundError extends AriError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND", 404);
  }
}

export class PolicyBlockedError extends AriError {
  constructor(reasonCodes: string[]) {
    super(`Policy blocked action: ${reasonCodes.join(", ")}`, "POLICY_BLOCKED", 403);
  }
}
