import { resolveAuth } from '../chat/config';
import { logger } from '../logger';
import { getOpenAIClient } from './openaiClient';
import type { ImageToolGenerateInput, ImageToolUnderstandInput } from '@/types';

type ImageAuthHeaders = {
  url: string;
  headers: Record<string, string>;
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function buildImageEndpoint(
  authBaseUrl: string,
  apiVersion: string,
  apiKey: string,
  modelName: string,
): ImageAuthHeaders {
  const base = authBaseUrl.replace(/\/+$/, '');
  const isAzure = /azure\.com/i.test(base) || /openai\.azure/i.test(base);

  if (isAzure) {
    return {
      url: `${base}/openai/deployments/${modelName}/images/generations?api-version=${apiVersion}`,
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    };
  }

  return {
    url: `${base}/v1/images/generations`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
}

export class ImageTool {
  // Creates an image using the configured image model provider.
  async generate({ prompt, size = '1024x1024', model }: ImageToolGenerateInput) {
    const auth = resolveAuth('image');
    auth.apiVersion = auth.apiVersion || '2025-04-01-preview';
    const modelName = model ?? auth.modelName;

    if (!auth.apiKey || !auth.baseUrl) {
      logger.error('ImageTool.generate:missing-config', {
        modelName,
      });
      throw new Error(
        'Image generation is not configured. Please set Base URL and API Key for the image model.',
      );
    }

    const { url, headers } = buildImageEndpoint(
      auth.baseUrl,
      auth.apiVersion,
      auth.apiKey,
      modelName,
    );
    const body = {
      prompt,
      n: 1,
      size,
      quality: 'medium',
      output_format: 'png',
    };

    const started = now();
    logger.debug('ImageTool.generate:start', {
      modelName,
      provider: auth.model.provider,
      url,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).catch((error) => {
      logger.error('ImageTool.generate:request-error', {
        modelName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });

    const duration = Math.round(now() - started);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error('ImageTool.generate:failed', {
        modelName,
        status: res.status,
        body: text,
        durationMs: duration,
      });
      throw new Error(`Image generation failed: ${res.status} ${text}`);
    }

    logger.debug('ImageTool.generate:success', {
      modelName,
      durationMs: duration,
    });

    const response = await res.json();

    return {
      image: response.data[0].b64_json,
      raw: response,
    };
  }

  // Performs multimodal understanding over a prompt + image input.
  async understand({ prompt, image, model }: ImageToolUnderstandInput) {
    if (!image) {
      throw new Error('ImageTool.understand requires `image`.');
    }

    const auth = resolveAuth('image');
    const client = getOpenAIClient(auth);
    const modelName = model ?? auth.modelName;
    const started = now();

    const imageUrl = image.url
      ? image.url
      : image.data
        ? `data:${image.mimeType || 'image/png'};base64,${image.data}`
        : null;

    if (!imageUrl) {
      throw new Error('ImageTool.understand requires image.url or image.data');
    }

    logger.debug('ImageTool.understand:start', {
      modelName,
      provider: auth.model.provider,
    });

    try {
      const completion = await client.agent.completions.create({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
      });

      const duration = Math.round(now() - started);
      logger.debug('ImageTool.understand:success', {
        modelName,
        durationMs: duration,
      });

      return {
        text: completion.choices?.[0]?.message?.content ?? '',
        choice: completion.choices?.[0],
      };
    } catch (error) {
      logger.error('ImageTool.understand:error', {
        modelName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
