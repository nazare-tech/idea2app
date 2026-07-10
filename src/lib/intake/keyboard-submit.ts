export type KeyboardSubmitEvent = {
  key: string
  shiftKey: boolean
  repeat: boolean
  isComposing: boolean
}

/** Returns true only for a deliberate, enabled plain-Enter submission. */
export function shouldSubmitOnEnter(
  event: KeyboardSubmitEvent,
  disabled = false
): boolean {
  return (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.repeat &&
    !event.isComposing &&
    !disabled
  )
}
