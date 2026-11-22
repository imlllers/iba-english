export function showRunnerBack(index: number, canGoTo: (targetIndex: number) => boolean): boolean {
  return index > 0 && canGoTo(index - 1);
}

export function showRunnerForward(
  index: number,
  pageCount: number,
  canGoTo: (targetIndex: number) => boolean,
  allowNextStep = true,
  demoMode = false,
): boolean {
  if (index >= pageCount - 1) {
    return !demoMode;
  }
  return allowNextStep && canGoTo(index + 1);
}