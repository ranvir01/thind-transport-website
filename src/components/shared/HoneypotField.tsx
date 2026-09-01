import { HONEYPOT_FIELD } from "@/lib/honeypot"

/**
 * Invisible-to-humans text input for the public forms. Bots that auto-fill
 * every field trip it; the server then returns a fake success (see
 * public-form-guard.ts). Hidden with an off-screen wrapper rather than
 * display:none or type="hidden" — the crude autofillers we're catching skip
 * both of those, and screen readers are told to ignore it either way.
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={HONEYPOT_FIELD}>Company website</label>
      <input
        type="text"
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  )
}
