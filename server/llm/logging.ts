import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { BaseMessage } from '@langchain/core/messages'
import { z } from 'zod'
import { getDb } from '../db/client'
import { llmCallLogs } from '../db/schema'
import { logger } from '../utils/logger'

export interface LlmCallOptions {
  nodeName: string
  standupId?: string
  model: string
  provider: string
}

/**
 * Calls the model with structured output and logs token usage + timing to the DB.
 * Wraps `itemSchema` in `z.object({ items: [...] })` because OpenAI and Anthropic
 * require object (not top-level array) schemas in their structured output APIs.
 */
export async function invokeStructured<TOut extends Record<string, unknown>, TIn = TOut>(
  model: BaseChatModel,
  itemSchema: z.ZodType<TOut, z.ZodTypeDef, TIn>,
  messages: BaseMessage[],
  options: LlmCallOptions
): Promise<TOut[]> {
  const wrappedSchema = z.object({ items: z.array(itemSchema as unknown as z.ZodType<TOut>) })
  const chain = model.withStructuredOutput(wrappedSchema, { includeRaw: true })

  const start = Date.now()
  let items: TOut[]
  let tokensIn = 0
  let tokensOut = 0
  let error: string | undefined

  try {
    const output = await chain.invoke(messages)
    const raw = output.raw as { usage_metadata?: { input_tokens?: number; output_tokens?: number } }
    tokensIn = raw.usage_metadata?.input_tokens ?? 0
    tokensOut = raw.usage_metadata?.output_tokens ?? 0
    items = output.parsed.items as TOut[]
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    await writeLog(options, 0, 0, Date.now() - start, error)
    throw err
  }

  await writeLog(options, tokensIn, tokensOut, Date.now() - start)
  return items
}

/**
 * Like invokeStructured but for a single object output (not an array).
 * Use when the LLM should return one top-level object rather than a list of items.
 */
export async function invokeSingleStructured<T>(
  model: BaseChatModel,
  schema: z.ZodType<T>,
  messages: BaseMessage[],
  options: LlmCallOptions
): Promise<T> {
  const chain = model.withStructuredOutput(schema, { includeRaw: true })

  const start = Date.now()
  let result: T
  let tokensIn = 0
  let tokensOut = 0

  try {
    const output = await chain.invoke(messages)
    const raw = output.raw as { usage_metadata?: { input_tokens?: number; output_tokens?: number } }
    tokensIn = raw.usage_metadata?.input_tokens ?? 0
    tokensOut = raw.usage_metadata?.output_tokens ?? 0

    if (output.parsed == null) {
      throw new Error(
        `[${options.nodeName}] LLM returned null parsed output. The model likely failed structured output validation. Raw response: ${JSON.stringify((output.raw as { content?: unknown })?.content ?? '').slice(0, 500)}`
      )
    }

    result = output.parsed as T
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await writeLog(options, 0, 0, Date.now() - start, error)
    throw err
  }

  await writeLog(options, tokensIn, tokensOut, Date.now() - start)
  return result
}

async function writeLog(
  options: LlmCallOptions,
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
      prompt: {},
      response: {},
      tokensIn,
      tokensOut,
      durationMs,
      error: error || null,
    })
  } catch (logErr) {
    logger.error({ err: logErr }, 'Failed to write LLM call log')
  }
}
