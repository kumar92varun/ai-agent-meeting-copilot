import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { Embeddings } from '@langchain/core/embeddings'
import { createOpenAIChatModel, createOpenAIEmbeddings } from './providers/openai'
import { createAnthropicChatModel } from './providers/anthropic'
import { createGoogleChatModel, createGoogleEmbeddings } from './providers/google'

export function getChatModel(): BaseChatModel {
  const provider = process.env.LLM_PROVIDER || 'openai'
  const model = process.env.LLM_MODEL || 'gpt-4o'
  const apiKey = process.env.LLM_API_KEY || ''
  const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.2')

  switch (provider) {
    case 'anthropic':
      return createAnthropicChatModel(apiKey, model, temperature) as unknown as BaseChatModel
    case 'google':
      return createGoogleChatModel(apiKey, model, temperature) as unknown as BaseChatModel
    case 'openai':
    default:
      return createOpenAIChatModel(apiKey, model, temperature) as unknown as BaseChatModel
  }
}

export function getEmbeddingModel(): Embeddings {
  const provider = process.env.EMBEDDING_PROVIDER || 'openai'
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
  const apiKey = process.env.EMBEDDING_API_KEY || process.env.LLM_API_KEY || ''

  switch (provider) {
    case 'google':
      return createGoogleEmbeddings(apiKey, model) as unknown as Embeddings
    case 'openai':
    default:
      return createOpenAIEmbeddings(apiKey, model) as unknown as Embeddings
  }
}

export function getLlmMeta() {
  return {
    provider: process.env.LLM_PROVIDER || 'openai',
    model: process.env.LLM_MODEL || 'gpt-4o',
  }
}
