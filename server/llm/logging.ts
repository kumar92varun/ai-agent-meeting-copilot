import type { BaseLanguageModel } from '@langchain/core/language_models/base'
import { getDb } from '../db/client'
import { llmCallLogs } from '../db/schema'
import { logger } from '../utils/logger'

export interface LlmCallOptions {
  nodeName: string
  standupId?: string
  model: string
  provider: string
}

export async function logLlmCall<T>(
  options: LlmCallOptions,
  fn: () => Promise<T & { tokensIn?: number; tokensOut?: number }>
): Promise<T> {
  const start = Date.now()
  let result: T
  let error: string | undefined

  try {
    result = await fn()
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - start
    await writeLog(options, {}, {}, 0, 0, durationMs, error)
    throw err
  }

  const durationMs = Date.now() - start
  const res = result as Record<string, unknown>
  const tokensIn = (res.tokensIn as number) || 0
  const tokensOut = (res.tokensOut as number) || 0

  await writeLog(options, {}, res, tokensIn, tokensOut, durationMs, error)
  return result
}

async function writeLog(
  options: LlmCallOptions,
  prompt: Record<string, unknown>,
  response: Record<string, unknown>,
  tokensIn: number,
  tokensOut: number,
  durationMs: number,
  error?: string
) {
  try {
    const db = getDb()
    await db.insert(llmCallLogs).values({
      nodeName: options.nodeName,
      standupId: options.standupId || null,
      model: options.model,
      provider: options.provider,
      prompt,
      response,
      tokensIn,
      tokensOut,
      durationMs,
      error: error || null,
    })
  } catch (logErr) {
    logger.error({ err: logErr }, 'Failed to write LLM call log')
  }
}

// Convenience wrapper: wraps a LangChain model call and logs it
export async function invokeWithLogging<T>(
  model: BaseLanguageModel,
  messages: unknown[],
  options: LlmCallOptions,
  _standupId?: string
): Promise<T> {
  const start = Date.now()
  let response: unknown
  let error: string | undefined

  try {
    response = await (model as { invoke: (m: unknown[]) => Promise<unknown> }).invoke(messages)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - start
    await writeLog(options, { messages }, {}, 0, 0, durationMs, error)
    throw err
  }

  const durationMs = Date.now() - start
  const res = response as Record<string, unknown>
  const usageMetadata = res.usage_metadata as Record<string, number> | undefined
  const tokensIn = usageMetadata?.input_tokens || 0
  const tokensOut = usageMetadata?.output_tokens || 0

  await writeLog(options, { messages }, { response: res }, tokensIn, tokensOut, durationMs, error)
  return response as T
}
