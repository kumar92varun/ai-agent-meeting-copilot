import { ChatAnthropic } from '@langchain/anthropic'

export function createAnthropicChatModel(apiKey: string, model: string, temperature: number) {
  return new ChatAnthropic({ apiKey, model, temperature })
}

// Anthropic doesn't provide standalone embeddings — use OpenAI by default
export function createAnthropicEmbeddings(_apiKey: string, _model: string) {
  throw new Error(
    'Anthropic does not provide an embeddings API. Set EMBEDDING_PROVIDER=openai when using LLM_PROVIDER=anthropic.'
  )
}
