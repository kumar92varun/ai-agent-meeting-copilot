export interface LlmModelMeta {
  id: string
  provider: 'openai' | 'anthropic' | 'google'
  hinglishCapable: boolean
  label: string
}

export const KNOWN_LLM_MODELS: LlmModelMeta[] = [
  { id: 'gpt-4o', provider: 'openai', hinglishCapable: true, label: 'GPT-4o' },
  { id: 'gpt-4o-mini', provider: 'openai', hinglishCapable: true, label: 'GPT-4o Mini' },
  { id: 'gpt-4-turbo', provider: 'openai', hinglishCapable: true, label: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', provider: 'openai', hinglishCapable: false, label: 'GPT-3.5 Turbo' },
  { id: 'claude-sonnet-4-5', provider: 'anthropic', hinglishCapable: true, label: 'Claude Sonnet 4.5' },
  { id: 'claude-sonnet-4-6', provider: 'anthropic', hinglishCapable: true, label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-5', provider: 'anthropic', hinglishCapable: true, label: 'Claude Opus 4.5' },
  { id: 'claude-haiku-4-5', provider: 'anthropic', hinglishCapable: false, label: 'Claude Haiku 4.5' },
  { id: 'gemini-1.5-pro', provider: 'google', hinglishCapable: true, label: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', provider: 'google', hinglishCapable: true, label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.0-pro', provider: 'google', hinglishCapable: false, label: 'Gemini 1.0 Pro' },
]

export function isHinglishCapable(modelId: string): boolean {
  const model = KNOWN_LLM_MODELS.find((m) => m.id === modelId)
  // Unknown models assumed capable (don't block)
  return model ? model.hinglishCapable : true
}
