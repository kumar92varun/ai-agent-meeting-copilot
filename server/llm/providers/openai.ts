import { ChatOpenAI } from '@langchain/openai'
import { OpenAIEmbeddings } from '@langchain/openai'

export function createOpenAIChatModel(apiKey: string, model: string, temperature: number) {
  return new ChatOpenAI({ apiKey, model, temperature })
}

export function createOpenAIEmbeddings(apiKey: string, model: string) {
  return new OpenAIEmbeddings({ apiKey, model })
}
