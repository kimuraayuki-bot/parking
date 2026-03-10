export function formatSlotLabel(slotId: number) {
  if (slotId >= 1 && slotId <= 8) {
    return `枠${slotId} [居住者用]`;
  }

  if (slotId >= 9 && slotId <= 16) {
    return `枠${slotId} [企業様来客用]`;
  }

  return `枠${slotId}`;
}
