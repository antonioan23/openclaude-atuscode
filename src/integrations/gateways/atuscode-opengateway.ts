import { defineGateway } from '../define.js'

/**
 * AtusCode Opengateway — aponta para o gateway de produção rodando em
 * https://atus.hostclube.com/v1 (o nvidia-proxy do hostclube).
 *
 * O catálogo é híbrido: tem o `discovery` configurado para puxar a lista
 * dinâmica de modelos via GET /v1/models (que o nvidia-proxy expõe com
 * ~140 modelos de NVIDIA NIM, GitHub Models, Pollinations, LLM7, tokenrouter,
 * Agnes AI). Pass-through puro — sem filtro — porque filtragem estava
 * quebrando a agentic.
 *
 * Autenticação: a chave de API do proxy local (`ATUSCODE_PROXY_KEY`, configurada
 * no `nvidia-proxy/.env` e replicada como default em setup). Funciona também
 * com `OPENGATEWAY_API_KEY` ou `OPENAI_API_KEY` (fallback).
 */

export default defineGateway({
  id: 'atuscode-opengateway',
  label: 'AtusCode Opengateway',
  category: 'aggregating',
  defaultBaseUrl: 'https://atus.hostclube.com/v1',
  defaultModel: 'minimax/m3',
  supportsModelRouting: true,
  vendorId: 'openai',
  setup: {
    requiresAuth: true,
    authMode: 'api-key',
    credentialEnvVars: [
      'ATUSCODE_PROXY_KEY',
      'OPENGATEWAY_API_KEY',
      'OPENAI_API_KEY',
    ],
  },
  validation: {
    kind: 'credential-env',
    credentialEnvVars: [
      'ATUSCODE_PROXY_KEY',
      'OPENGATEWAY_API_KEY',
      'OPENAI_API_KEY',
    ],
    missingCredentialMessage:
      'ATUSCODE_PROXY_KEY is required to use AtusCode Opengateway.\n' +
      'Set it to the key issued by your hostclube admin (mint one in the\n' +
      'nvidia-proxy at /home/hostclub/nvidia-proxy/seed-master-key.js), or\n' +
      'use OPENGATEWAY_API_KEY / OPENAI_API_KEY as a fallback.',
    routing: {
      matchBaseUrlHosts: [
        'atus.hostclube.com',
        'hostclube.com',
        'opengateway.atuscode.com',
        'opengateway.fly.dev',
      ],
    },
  },
  transportConfig: {
    kind: 'openai-compatible',
    openaiShim: {
      headers: {
        'Accept-Encoding': 'identity',
      },
      defaultAuthHeader: {
        name: 'authorization',
        scheme: 'bearer',
      },
      maxTokensField: 'max_completion_tokens',
      removeBodyFields: ['store', 'stream_options'],
      supportsApiFormatSelection: false,
      supportsAuthHeaders: false,
    },
  },
  preset: {
    id: 'atuscode-opengateway',
    description:
      'AtusCode Opengateway — hostclube-managed gateway. Routes to NVIDIA NIM, ' +
      'MiniMax M3, GitHub Models, Pollinations, LLM7 and more via a single ' +
      'OpenAI-compatible base URL.',
    apiKeyEnvVars: [
      'ATUSCODE_PROXY_KEY',
      'OPENGATEWAY_API_KEY',
      'OPENAI_API_KEY',
    ],
    label: 'AtusCode Opengateway',
    name: 'AtusCode Opengateway',
    vendorId: 'openai',
    modelEnvVars: ['OPENAI_MODEL'],
    baseUrlEnvVars: ['OPENGATEWAY_BASE_URL', 'OPENAI_BASE_URL'],
    fallbackBaseUrl: 'https://atus.hostclube.com/v1',
    fallbackModel: 'minimax/m3',
    badge: { text: 'Recommended', color: 'success' },
  },
  catalog: {
    source: 'hybrid',
    // Descoberta dinâmica: GET /v1/models retorna ~140 modelos
    // (NVIDIA NIM, GitHub Models, Pollinations, LLM7, tokenrouter, Agnes AI).
    // Pass-through puro (sem filtro) para preservar agentic model selection.
    discovery: {
      kind: 'openai-compatible',
      mapModel(raw: unknown) {
        const model = raw as {
          id?: string
          active?: boolean
          context_window?: number
        }
        if (!model.id || model.active === false) {
          return null
        }
        return {
          id: model.id,
          apiName: model.id,
          label: model.id,
          ...(model.context_window
            ? { contextWindow: model.context_window }
            : {}),
        }
      },
    },
    discoveryCacheTtl: '1d',
    discoveryRefreshMode: 'background-if-stale',
    allowManualRefresh: true,
    // Modelos pinned (sempre aparecem mesmo se o /v1/models estiver fora)
    models: [
      {
        id: 'atuscode-minimax-m3',
        apiName: 'minimax/m3',
        label: 'MiniMax M3 (Free, via tokenrouter)',
        modelDescriptorId: 'minimax-m3',
        notes: 'Free',
      },
      {
        id: 'atuscode-llama-3.1-8b',
        apiName: 'meta/llama-3.1-8b-instruct',
        label: 'Llama 3.1 8B (NVIDIA NIM)',
        modelDescriptorId: 'llama-3.1-8b',
        notes: 'Free',
      },
      {
        id: 'atuscode-gpt-4o-mini',
        apiName: 'github/gpt-4o-mini',
        label: 'GPT-4o Mini (GitHub Models)',
        modelDescriptorId: 'gpt-4o-mini',
        notes: 'Free tier',
      },
    ],
  },
  usage: { supported: false },
})
