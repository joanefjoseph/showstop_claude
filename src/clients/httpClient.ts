import { UpstreamError, type UpstreamName } from '../errors.ts';
export interface HttpClientOptions {
  name: UpstreamName;
  baseUrl: string;
  timeoutMs: number;
  defaultHeaders?: Record<string, string>;
}
export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}
/**
 * Small fetch wrapper (Node 18+ global fetch) that:
 *  - prefixes a base URL, serialises JSON
 *  - applies a timeout via AbortController
 *  - converts non-2xx responses / network failures into UpstreamError
 */
export class HttpClient {
  constructor(private readonly opts: HttpClientOptions) {}
  get<T>(path: string, o?: RequestOptions) { return this.request<T>('GET', path, o); }
  post<T>(path: string, o?: RequestOptions) { return this.request<T>('POST', path, o); }
  put<T>(path: string, o?: RequestOptions) { return this.request<T>('PUT', path, o); }
  async request<T>(method: string, path: string, o: RequestOptions = {}): Promise<T> {
    const url = new URL(path.replace(/^\//, ''), this.opts.baseUrl.replace(/\/?$/, '/'));
    for (const [k, v] of Object.entries(o.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(o.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...this.opts.defaultHeaders,
          ...o.headers,
        },
        body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = (err as Error).name === 'AbortError';
      throw new UpstreamError(
        this.opts.name,
        aborted ? 504 : 502,
        aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNREACHABLE',
        `${this.opts.name} request ${method} ${url.pathname} ${aborted ? 'timed out' : 'failed'}`,
        { cause: (err as Error).message },
      );
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    const json = text ? safeJson(text) : undefined;
    if (!res.ok) {
      throw this.mapError(res.status, json ?? text, method, url.pathname);
    }
    return json as T;
  }
  private mapError(status: number, payload: unknown, method: string, path: string): UpstreamError {
    const upstreamMsg =
      (payload as { message?: string; error?: string } | undefined)?.message ??
      (payload as { error?: string } | undefined)?.error ??
      `HTTP ${status}`;
    // Auth failures are a configuration problem on OUR side, not the caller's.
    if (status === 401 || status === 403) {
      return new UpstreamError(this.opts.name, 502, 'UPSTREAM_AUTH_FAILED',
        `${this.opts.name} rejected our credentials`, { status, upstreamMsg });
    }
    if (status === 404) {
      return new UpstreamError(this.opts.name, 404, 'NOT_FOUND', upstreamMsg, { method, path });
    }
    if (status === 409) {
      return new UpstreamError(this.opts.name, 409, 'CONFLICT', upstreamMsg, payload);
    }
    if (status === 410) {
      return new UpstreamError(this.opts.name, 410, 'EXPIRED', upstreamMsg, payload);
    }
    if (status === 429) {
      return new UpstreamError(this.opts.name, 429, 'RATE_LIMITED', `${this.opts.name} rate limit hit`, payload);
    }
    if (status >= 400 && status < 500) {
      return new UpstreamError(this.opts.name, 400, 'UPSTREAM_REJECTED', upstreamMsg, payload);
    }
    return new UpstreamError(this.opts.name, 502, 'UPSTREAM_ERROR',
      `${this.opts.name} returned ${status}`, { upstreamMsg });
  }
}
function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return undefined; }
}
