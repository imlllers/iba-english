const pending = new Set<Promise<void>>();

export function trackSpeakingUpload(task: Promise<void>) {
  pending.add(task);
  void task.finally(() => pending.delete(task));
  return task;
}

export function waitForSpeakingUploads() {
  return Promise.all([...pending]).then(() => undefined);
}
