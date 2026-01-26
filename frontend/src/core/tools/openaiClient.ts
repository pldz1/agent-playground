import { logger } from '../logger';
import type { RuntimeAuthConfig } from '../chat/config';

type AgentCompletionArgs = {
  model: string;
  temperature?: number;
  messages: any[];
  response_format?: any;
  [k: string]: any;
};

type PostArgs = {
  path: string;
  body: any;
  headers?: Record<string, string>;
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function ensureAuth(auth: RuntimeAuthConfig) {
  if (!auth.apiKey || !auth.baseUrl) {
    const missing = [];
    if (!auth.apiKey) missing.push('API key');
    if (!auth.baseUrl) missing.push('base URL');
    throw new Error(
      `Missing ${missing.join(' and ')} for model "${auth.modelName}". ` +
        `Please configure it in Settings > Models.`,
    );
  }
}

export function getOpenAIClient(auth: RuntimeAuthConfig) {
  ensureAuth(auth);

  const baseUrl = `${normalizeBaseUrl(auth.baseUrl)}openai/v1/`;

  async function postJson({ path, body, headers = {} }: PostArgs) {
    const url = new URL(path, baseUrl).toString();

    const started = now();
    logger.debug(`${auth.role} → POST ${path}`, {
      modelName: auth.modelName,
      provider: auth.model.provider,
      url,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.apiKey}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    }).catch((error) => {
      logger.error(`${auth.role} → request failed`, { path, error });
      throw error;
    });

    const elapsed = Math.round(now() - started);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error(`${auth.role} - ${res.status}`, {
        path,
        status: res.status,
        body: text,
        durationMs: elapsed,
      });
      throw new Error(`OpenAI request failed: ${res.status} ${text}`);
    }

    logger.debug(`${auth.role} - ${res.status}`, {
      path,
      status: res.status,
      durationMs: elapsed,
    });
    return res.json();
  }

  return {
    agent: {
      completions: {
        create: (args: AgentCompletionArgs) => postJson({ path: 'chat/completions', body: args }),
      },
    },
    responses: {
      create: (args: any) => postJson({ path: 'responses', body: args }),
    },
  };
}
