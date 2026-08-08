export function renderPhaseInstruction(textarea, step) {
  if (!textarea) return;
  const value = String(step?.instruction || '');
  if (textarea.value !== value) textarea.value = value;
  textarea.dataset.phaseId = step?.phaseId || '';
}

export function updatePhaseInstruction(board, phaseIndex, value) {
  const step = board?.steps?.[phaseIndex];
  if (!step) return board;
  step.instruction = String(value || '').slice(0, 2000);
  return board;
}
