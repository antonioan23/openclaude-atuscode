import { defineGateway } from '../define.js'

/**
 * AtusCode Opengateway — aponta para o gateway de produção rodando em
 * https://atus.hostclube.com/v1 (o nvidia-proxy do hostclube).
 *
 * Esse gateway expõe um endpoint OpenAI-compatible que roteia para múltiplos
 * modelos (NVIDIA NIM, MiniMax M3, GitHub Models, Pollinations, etc.) através
 * de um único base URL.
 *
 * Autenticação: a chave de API do proxy local (`ATUSCODE_PROXY_KEY`, configurada
 * no `nvidia-proxy/.env` e replicada como default em setup). Funciona também
 * com `OPENGATEWAY_API_KEY` ou `OPENAI_API_KEY` (fallback).
 *
 * Em vez de distribuir o gateway como um SaaS externo, ele roda **dentro do
 * hostclube** — qualquer instalação do atuscode que apontar para essa URL
 * vai usar o proxy local, sem precisar de signup externo.
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
    // ATUSCODE_PROXY_KEY tem prioridade (chave do gateway local do hostclube);
    // OPENGATEWAY_API_KEY e OPENAI_API_KEY mantidos como fallback para
    // usuários que já tinham configs anteriores.
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
    source: 'static',
    models: [
      // Default — MiniMax M3, the free model available on tokenrouter upstream.
      {
        id: 'atuscode-minimax-m3',
        apiName: 'minimax/m3',
        label: 'MiniMax M3 (via AtusCode Opengateway)',
        modelDescriptorId: 'minimax-m3',
        notes: 'Free',
      },
      // NVIDIA NIM models (default upstream of the proxy)
      {
        id: 'atuscode-llama-3.1-8b',
        apiName: 'meta/llama-3.1-8b-instruct',
        label: 'Llama 3.1 8B (via AtusCode Opengateway)',
        modelDescriptorId: 'llama-3.1-8b',
        notes: 'Free',
      },
      {
        id: 'atuscode-llama-3.1-70b',
        apiName: 'meta/llama-3.1-70b-instruct',
        label: 'Llama 3.1 70B (via AtusCode Opengateway)',
        modelDescriptorId: 'llama-3.1-70b',
      },
      {
        id: 'atuscode-llama-3.3-70b',
        apiName: 'meta/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B (via AtusCode Opengateway)',
        modelDescriptorId: 'llama-3.3-70b',
      },
      // GitHub Models (free)
      {
        id: 'atuscode-gpt-4o-mini',
        apiName: 'gpt-4o-mini',
        label: 'GPT-4o Mini (via AtusCode Opengateway, GitHub)',
        modelDescriptorId: 'gpt-4o-mini',
        notes: 'Free tier',
      },
      {
        id: 'atuscode-phi-3.5',
        apiName: 'phi-3.5-mini',
        label: 'Phi 3.5 Mini (via AtusCode Opengateway, GitHub)',
        modelDescriptorId: 'phi-3.5-mini',
        notes: 'Free',
      },
      // Pollinations (free)
      {
        id: 'atuscode-pollinations-openai-fast',
        apiName: 'openai-fast',
        label: 'OpenAI Fast (via AtusCode Opengateway, Pollinations)',
        modelDescriptorId: 'openai-fast',
        notes: 'Free',
      },
      // LLM7 (free)
      {
        id: 'atuscode-ll7m',
        apiName: 'll7m',
        label: 'LLM7 Default (via AtusCode Opengateway)',
        modelDescriptorId: 'll7m',
        notes: 'Free',
      },
    ],
  },
  usage: { supported: false },
})
