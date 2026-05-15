export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function toApiError(err: unknown): { error: { code: string; message: string; details?: unknown } } {
  if (err instanceof AppError) {
    return {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    }
  }
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'An unexpected error occurred',
    },
  }
}
