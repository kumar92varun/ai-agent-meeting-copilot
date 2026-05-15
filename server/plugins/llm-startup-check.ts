import { warnIfWeakHinglishModel } from '../llm/model-warnings'

export default defineNitroPlugin(() => {
  const model = process.env.LLM_MODEL || 'gpt-4o'
  warnIfWeakHinglishModel(model)
})
