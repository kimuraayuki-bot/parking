import { requiredEnv } from '@/lib/server-env';

const GAS_ENDPOINT = () => requiredEnv('GAS_WEB_APP_URL');

type Method = 'GET' | 'POST';

export async function callGas<T>(args: {
  method: Method;
  action: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}) {
  const url = new URL(GAS_ENDPOINT());
  if (args.method === 'GET') {
    url.searchParams.set('action', args.action);
    for (const [key, value] of Object.entries(args.query || {})) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: args.method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: args.method === 'POST' ? JSON.stringify({ action: args.action, ...(args.body || {}) }) : undefined,
    cache: 'no-store'
  });

  const json = await response.json();
  return json as T;
}
