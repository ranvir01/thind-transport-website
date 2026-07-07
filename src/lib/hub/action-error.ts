/**
 * Map caught exceptions to user-safe action error strings. Internal failures
 * (Postgres, network, env) must not leak into Sonner toasts — only intentional
 * business/permission messages from hub lib code should surface.
 */
export function isInternalActionError(message: string): boolean {
  const msg = message.trim()
  if (!msg) return true
  return (
    /violates (foreign key|unique|check|not-null)|duplicate key value|relation .+ does not exist|column .+ does not exist|syntax error at|connection terminated|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|POSTGRES_URL is not set|Unexpected token|\/node_modules\//i.test(
      msg
    ) || /\n\s+at /.test(msg)
  )
}

export function actionErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  const msg = err.message.trim()
  if (!msg || isInternalActionError(msg)) {
    console.error(`[hub action] ${fallback}:`, err)
    return fallback
  }
  return msg
}

export function actionError(err: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: actionErrorMessage(err, fallback) }
}
