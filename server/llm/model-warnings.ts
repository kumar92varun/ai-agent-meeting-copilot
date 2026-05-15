import { isHinglishCapable } from '../../shared/constants/llm-models'
import { logger } from '../utils/logger'

export function warnIfWeakHinglishModel(modelId: string) {
  if (!isHinglishCapable(modelId)) {
    logger.warn(
      { model: modelId },
      `Configured model "${modelId}" has known weak Hinglish performance. ` +
        'Recommended: gpt-4o or claude-sonnet-4-5+'
    )
  }
}
