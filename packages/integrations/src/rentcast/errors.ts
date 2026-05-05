export class RentcastError extends Error {
  constructor(message: string, public readonly statusCode = 502) {
    super(message);
  }
}
