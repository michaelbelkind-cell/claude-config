import 'dotenv/config';

// Per-environment base URLs. Only QA is wired up today; staging/prod are
// placeholders so the tool can grow without restructuring.
const ENVIRONMENTS = {
  qa: {
    orderCreationBase: 'https://automation-order-creation-qa.bglobale.com',
    connectBase: 'https://connect-qa.bglobale.com',
  },
  // staging: { orderCreationBase: '...', connectBase: '...' },
  // prod:    { orderCreationBase: '...', connectBase: '...' },
};

export function loadConfig() {
  const envName = (process.env.GLBE_ENV || 'qa').toLowerCase();
  const env = ENVIRONMENTS[envName];

  if (!env) {
    throw new Error(
      `Unknown GLBE_ENV "${envName}". Valid: ${Object.keys(ENVIRONMENTS).join(', ')}`,
    );
  }

  // Safety gate: refuse non-QA unless explicitly allowed.
  if (envName !== 'qa' && process.env.GLBE_ALLOW_NON_QA !== 'true') {
    throw new Error(
      `Refusing to run against "${envName}". Set GLBE_ALLOW_NON_QA=true to override.`,
    );
  }

  const authToken = process.env.GLBE_AUTH_TOKEN;
  const apiKey = process.env.GLBE_API_KEY;
  if (!authToken) throw new Error('Missing GLBE_AUTH_TOKEN (set it in .env).');
  if (!apiKey) throw new Error('Missing GLBE_API_KEY (set it in .env).');

  // Postman calls the Order/* connect endpoints over HTTP (fulfil/status/dispatch),
  // while return-configuration and Return use HTTPS. Mirror that exactly.
  const connectBaseHttp = env.connectBase.replace(/^https:/, 'http:');

  return { envName, ...env, connectBaseHttp, authToken, apiKey };
}
