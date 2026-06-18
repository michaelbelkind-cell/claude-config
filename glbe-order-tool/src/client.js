// Thin wrapper over native fetch (Node 18+). No external HTTP deps.
// Logs each request/response and throws on non-2xx with a useful message.

let counter = 0;

export async function request(method, url, { headers = {}, body } = {}) {
  const id = ++counter;
  const payload =
    body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);

  console.log(`→ [${id}] ${method} ${shortUrl(url)}`);

  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text; // non-JSON response; keep as raw text
  }

  if (!res.ok) {
    console.error(`← [${id}] ${res.status} ${res.statusText}`);
    const snippet = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(
      `HTTP ${res.status} for ${method} ${shortUrl(url)}: ${(snippet || '').slice(0, 400)}`,
    );
  }

  console.log(`← [${id}] ${res.status} OK`);
  if (process.env.GLBE_DEBUG === 'true') {
    const snippet = typeof data === 'string' ? data : JSON.stringify(data);
    console.log(`    data: ${(snippet || '(empty)').slice(0, 300)}`);
  }
  return data;
}

// Trim query strings in logs so secrets/long status blobs don't flood the console.
function shortUrl(url) {
  const i = url.indexOf('?');
  return i === -1 ? url : `${url.slice(0, i)}?…`;
}
