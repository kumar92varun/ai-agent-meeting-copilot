import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'

export function createGoogleChatModel(apiKey: string, model: string, temperature: number) {
  return new ChatGoogleGenerativeAI({ apiKey, model, temperature })
}

export function createGoogleEmbeddings(apiKey: string, model: string) {
  return new GoogleGenerativeAIEmbeddings({ apiKey, model })
}
