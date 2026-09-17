export type UpstreamName = 'ticket-vendor' | 'membership';
/** Error that maps directly to an HTTP response from this service. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
/** Error originating from one of the upstream APIs. */
export class UpstreamError extends AppError {
  constructor(
    public readonly upstream: UpstreamName,
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(status, code, message, details);
    this.name = 'UpstreamError';
  }
}
export const notFound = (what: string, id: string) =>
  new AppError(404, 'NOT_FOUND', `${what} '${id}' was not found`);
export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details);
