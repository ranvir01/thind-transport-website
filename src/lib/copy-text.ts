/**
 * Copy a string to the clipboard from a click handler.
 *
 * `navigator.clipboard.writeText` is the modern path but it throws in
 * several real cases we hit on this site: missing permission, some
 * in-app browsers, and automation without clipboard grants. Fall back
 * to a hidden textarea + `execCommand("copy")` so the share-kit
 * "Copy post" button still works on a driver's phone.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through
    }
  }
  if (typeof document === "undefined") return false
  try {
    const el = document.createElement("textarea")
    el.value = text
    el.setAttribute("readonly", "")
    el.setAttribute("aria-hidden", "true")
    el.style.position = "fixed"
    el.style.top = "0"
    el.style.left = "0"
    el.style.width = "1px"
    el.style.height = "1px"
    el.style.opacity = "0"
    document.body.appendChild(el)
    el.focus()
    el.select()
    el.setSelectionRange(0, text.length)
    const ok = document.execCommand("copy")
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}
