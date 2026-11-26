let stream: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;
let holders = 0;
let stopTimer: number | null = null;

function liveStream() {
  if (!stream) {
    return null;
  }
  if (stream.getTracks().some((track) => track.readyState === "live")) {
    return stream;
  }
  stream.getTracks().forEach((track) => track.stop());
  stream = null;
  return null;
}

function cancelStop() {
  if (stopTimer == null) {
    return;
  }
  window.clearTimeout(stopTimer);
  stopTimer = null;
}

function getOrCreateSpeakingMic() {
  const current = liveStream();
  if (current) {
    return Promise.resolve(current);
  }
  if (pending) {
    return pending;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(new Error("unsupported"));
  }
  pending = navigator.mediaDevices.getUserMedia({ audio: true }).then(
    (next) => {
      stream = next;
      pending = null;
      return next;
    },
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );
  return pending;
}

export function acquireSpeakingMic() {
  return getOrCreateSpeakingMic();
}

export function holdSpeakingMic() {
  holders += 1;
  cancelStop();
  return getOrCreateSpeakingMic();
}

export function releaseSpeakingMic() {
  holders = Math.max(0, holders - 1);
  if (holders > 0) {
    return;
  }
  cancelStop();
  stopTimer = window.setTimeout(() => {
    stopTimer = null;
    if (holders > 0) {
      return;
    }
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }, 0);
}

export function resetSpeakingMic() {
  holders = 0;
  pending = null;
  cancelStop();
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
}
