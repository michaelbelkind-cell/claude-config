// Hardened wrapper over native fetch (Node 18+). No external HTTP deps.
// Features for unstable environments (e.g. QA):
//   - per-request timeout via AbortController
//   - automatic retry with exponential backoff + jitter on transient failures
//   - verbose logging gated behind GLBE_DEBUG (so 50k runs don't flood the console)

let counter = 0;

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_CODES = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
  'ECONNABORTED',
];

export async function request(method, url, opts = {}) {
  const {
    headers = {},
    body,
    timeoutMs = 60000,
    retries = 4,
    retryOnTimeoutBody = false,
    delayMs = 0,
  } = opts;
  const payload =
    body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  const debug = process.env.GLBE_DEBUG === 'true';
  const id = ++counter;

  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (debug) {
        console.log(`→ [${id}] ${method} ${shortUrl(url)}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
      }
      const res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
      const text = await res.text();

      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!res.ok) {
        // Retry on transient status codes, or on a server-side timeout reported in
        // the body (e.g. QA returning 400 "Execution Timeout Expired" under load).
        const timeoutBody = retryOnTimeoutBody && /timeout|timed out/i.test(text || '');
        if ((RETRYABLE_STATUS.has(res.status) || timeoutBody) && attempt <= retries) {
          await sleep(backoff(attempt));
          continue;
        }
        const snippet = typeof data === 'string' ? data : JSON.stringify(data);
        throw new Error(
          `HTTP ${res.status} for ${method} ${shortUrl(url)}: ${(snippet || '').slice(0, 300)}`,
        );
      }

      if (debug) {
        console.log(`← [${id}] ${res.status} OK`);
        const snippet = typeof data === 'string' ? data : JSON.stringify(data);
        console.log(`    data: ${(snippet || '(empty)').slice(0, 300)}`);
      }
      // Pace requests (mimics Postman Runner's inter-request delay). Gives the QA
      // backend time to process each step and sync the order into ReturnGo.
      if (delayMs > 0) await sleep(delayMs);
      return data;
    } catch (err) {
      if (attempt <= retries && isRetryableError(err)) {
        if (debug) {
          const reason = err.name === 'AbortError' ? `timeout ${timeoutMs}ms` : err.message;
          console.log(`  ↻ [${id}] retry ${attempt}/${retries} after: ${reason}`);
        }
        await sleep(backoff(attempt));
        continue;
      }
      if (err.name === 'AbortError') {
        throw new Error(`Timeout after ${timeoutMs}ms for ${method} ${shortUrl(url)}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

function isRetryableError(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true; // our own timeout
  if (RETRYABLE_CODES.includes(err.code) || RETRYABLE_CODES.includes(err.cause?.code)) return true;
  // Node's fetch surfaces low-level network errors as "fetch failed" TypeErrors.
  if (typeof err.message === 'string' && err.message.includes('fetch failed')) return true;
  return false;
}

// Exponential backoff with jitter: ~0.5s, 1s, 2s, 4s, … capped at 15s.
function backoff(attempt) {
  const base = Math.min(15000, 500 * 2 ** (attempt - 1));
  return base + Math.floor(Math.random() * 250);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Trim query strings in logs so secrets/long status blobs don't flood the console.
function shortUrl(url) {
  const i = url.indexOf('?');
  return i === -1 ? url : `${url.slice(0, i)}?…`;
}
