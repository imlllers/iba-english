import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { formatVideoTime } from "@/shared/lib/format";
import { Icon } from "@/shared/ui/Icon";

const IDLE_MS = 2200;

export type VideoPlayerProps = {
  src: string;
  poster?: string;
  seekable?: boolean;
  autoPlay?: boolean;
  autoPlayDelayMs?: number;
  onEnded?: () => void;
  onPlayStart?: () => void;
  controlsHidden?: boolean;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
};

function fullscreenElement() {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function enterFullscreen(node: HTMLElement) {
  const el = node as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (node.requestFullscreen) {
    await node.requestFullscreen();
    return;
  }
  el.webkitRequestFullscreen?.();
}

async function exitFullscreen() {
  const doc = document as Document & { webkitExitFullscreen?: () => void };
  if (document.exitFullscreen && document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  doc.webkitExitFullscreen?.();
}

export function VideoPlayer({
  src,
  poster,
  seekable = true,
  autoPlay = false,
  autoPlayDelayMs = 0,
  onEnded,
  onPlayStart,
  controlsHidden = false,
  className,
  style,
  "aria-label": ariaLabel = "Видео",
}: VideoPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number>(0);
  const dragging = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [idle, setIdle] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [frameReady, setFrameReady] = useState(Boolean(poster));
  const playStartFired = useRef(false);

  useEffect(() => {
    playStartFired.current = false;
  }, [src]);

  const syncTimes = useCallback(() => {
    const node = videoRef.current;
    if (!node) {
      return;
    }
    setCurrent(node.currentTime);
    setDuration(Number.isFinite(node.duration) ? node.duration : 0);
    if (node.buffered.length > 0 && Number.isFinite(node.duration) && node.duration > 0) {
      setBuffered(Math.min(100, (node.buffered.end(node.buffered.length - 1) / node.duration) * 100));
    }
  }, []);

  const clearIdle = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    setIdle(false);
  }, []);

  const bumpIdle = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    setIdle(false);
    const node = videoRef.current;
    if (!node || node.paused) {
      return;
    }
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) {
      return;
    }
    const onPlay = () => {
      setPlaying(true);
      bumpIdle();
      if (!playStartFired.current) {
        playStartFired.current = true;
        onPlayStart?.();
      }
    };
    const onPause = () => {
      setPlaying(false);
      clearIdle();
    };
    node.addEventListener("timeupdate", syncTimes);
    node.addEventListener("loadedmetadata", syncTimes);
    node.addEventListener("durationchange", syncTimes);
    node.addEventListener("progress", syncTimes);
    const markFrameReady = () => setFrameReady(true);
    const paintFirstFrame = () => {
      if (node.currentTime === 0) {
        try {
          node.currentTime = 0.001;
        } catch {
          markFrameReady();
        }
      }
    };
    node.addEventListener("play", onPlay);
    node.addEventListener("pause", onPause);
    node.addEventListener("ended", onPause);
    node.addEventListener("loadedmetadata", paintFirstFrame);
    node.addEventListener("loadeddata", markFrameReady);
    node.addEventListener("seeked", markFrameReady);
    node.addEventListener("canplay", markFrameReady);
    if (node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      markFrameReady();
    }
    return () => {
      node.removeEventListener("timeupdate", syncTimes);
      node.removeEventListener("loadedmetadata", syncTimes);
      node.removeEventListener("durationchange", syncTimes);
      node.removeEventListener("progress", syncTimes);
      node.removeEventListener("play", onPlay);
      node.removeEventListener("pause", onPause);
      node.removeEventListener("ended", onPause);
      node.removeEventListener("loadedmetadata", paintFirstFrame);
      node.removeEventListener("loadeddata", markFrameReady);
      node.removeEventListener("seeked", markFrameReady);
      node.removeEventListener("canplay", markFrameReady);
    };
  }, [src, syncTimes, bumpIdle, clearIdle, onPlayStart]);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setBuffered(0);
    setIdle(false);
    setFrameReady(Boolean(poster));
  }, [src, poster]);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }
    const node = videoRef.current;
    if (!node) {
      return;
    }
    let delayElapsed = autoPlayDelayMs <= 0;
    let mediaReady = node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    let cancelled = false;
    const tryPlay = () => {
      if (cancelled || !delayElapsed || !mediaReady) {
        return;
      }
      if (!node.paused || (node.ended && node.currentTime > 0.05)) {
        return;
      }
      void node.play().catch(() => setPlaying(false));
    };
    const onReady = () => {
      mediaReady = true;
      tryPlay();
    };
    const started = window.setTimeout(() => {
      delayElapsed = true;
      tryPlay();
    }, Math.max(0, autoPlayDelayMs));
    node.addEventListener("loadeddata", onReady);
    node.addEventListener("canplay", onReady);
    if (mediaReady) {
      onReady();
    }
    return () => {
      cancelled = true;
      window.clearTimeout(started);
      node.removeEventListener("loadeddata", onReady);
      node.removeEventListener("canplay", onReady);
    };
  }, [autoPlay, autoPlayDelayMs, src]);

  useEffect(() => {
    const onFs = () => setFullscreen(fullscreenElement() === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  const toggle = useCallback(async () => {
    const node = videoRef.current;
    if (!node) {
      return;
    }
    if (node.paused) {
      if (node.ended || (Number.isFinite(node.duration) && node.duration > 0 && node.currentTime >= node.duration - 0.05)) {
        node.currentTime = 0;
      }
      try {
        await node.play();
      } catch {
        setPlaying(false);
      }
    } else {
      node.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const node = videoRef.current;
    if (!node) {
      return;
    }
    node.muted = !node.muted;
    setMuted(node.muted);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    try {
      if (fullscreenElement() === root) {
        await exitFullscreen();
      } else {
        await enterFullscreen(root);
      }
    } catch {
    }
  }, []);

  const seekTo = (clientX: number) => {
    if (!seekable) {
      return;
    }
    const node = videoRef.current;
    const bar = progressRef.current;
    if (!node || !bar || !Number.isFinite(node.duration) || node.duration <= 0) {
      return;
    }
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    node.currentTime = ratio * node.duration;
    syncTimes();
  };

  const onProgressPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!seekable) {
      return;
    }
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekTo(event.clientX);
  };

  const onProgressPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) {
      return;
    }
    seekTo(event.clientX);
  };

  const onProgressPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      void toggle();
      return;
    }
    if (event.key === "m" || event.key === "M" || event.key === "ь" || event.key === "Ь") {
      event.preventDefault();
      toggleMute();
      return;
    }
    if (event.key === "f" || event.key === "F" || event.key === "а" || event.key === "А") {
      event.preventDefault();
      void toggleFullscreen();
    }
  };

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const timeLabel = `${formatVideoTime(current)} / ${formatVideoTime(duration)}`;
  const classes = ["iba-video-player", className].filter(Boolean).join(" ");

  return (
    <div
      ref={rootRef}
      className={classes}
      style={style}
      tabIndex={controlsHidden ? -1 : 0}
      data-paused={playing ? undefined : ""}
      data-idle={controlsHidden ? undefined : idle ? "" : undefined}
      data-seekable={seekable ? undefined : "false"}
      data-fullscreen={fullscreen ? "" : undefined}
      data-controls-hidden={controlsHidden ? "" : undefined}
      data-frame-ready={frameReady ? "" : undefined}
      onMouseMove={controlsHidden ? undefined : bumpIdle}
      onPointerDown={controlsHidden ? undefined : bumpIdle}
      onKeyDown={controlsHidden ? undefined : onRootKeyDown}
    >
      <video
        ref={videoRef}
        className="iba-video-player__video"
        src={src}
        poster={poster}
        playsInline
        preload="auto"
        aria-label={ariaLabel}
        onClick={controlsHidden ? undefined : () => { void toggle(); }}
        onEnded={onEnded}
      />
      {!controlsHidden ? (
      <div className="iba-video-player__overlay">
        <div className="iba-video-player__bar">
          <div
            ref={progressRef}
            className="iba-video-player__progress"
            role={seekable ? "slider" : "progressbar"}
            aria-label="Прогресс"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration) || 0}
            aria-valuenow={Math.floor(current)}
            tabIndex={seekable ? 0 : undefined}
            onPointerDown={onProgressPointerDown}
            onPointerMove={onProgressPointerMove}
            onPointerUp={onProgressPointerUp}
            onPointerCancel={onProgressPointerUp}
            onKeyDown={(event) => {
              if (!seekable) {
                return;
              }
              const node = videoRef.current;
              if (!node || !Number.isFinite(node.duration)) {
                return;
              }
              const step = event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0;
              if (!step) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              node.currentTime = Math.min(node.duration, Math.max(0, node.currentTime + step));
              syncTimes();
            }}
          >
            <div className="iba-video-player__track">
              <div className="iba-video-player__buffered" style={{ width: `${buffered}%` }} />
              <div className="iba-video-player__fill" style={{ width: `${progress}%` }} />
              <div className="iba-video-player__thumb" style={{ left: `${progress}%` }} />
            </div>
          </div>
          <div className="iba-video-player__row">
            <button
              type="button"
              className="iba-video-player__btn"
              aria-label={playing ? "Пауза" : "Воспроизвести"}
              onClick={(event) => {
                event.stopPropagation();
                void toggle();
              }}
            >
              <Icon name={playing ? "pause" : "play"} size={18} filled={!playing} />
            </button>
            <button
              type="button"
              className="iba-video-player__btn"
              aria-label={muted ? "Включить звук" : "Выключить звук"}
              onClick={(event) => {
                event.stopPropagation();
                toggleMute();
              }}
            >
              <Icon name={muted ? "mute" : "volume"} size={18} />
            </button>
            <span className="iba-video-player__time">{timeLabel}</span>
            <span className="iba-video-player__grow" />
            <button
              type="button"
              className="iba-video-player__btn"
              aria-label={fullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
              onClick={(event) => {
                event.stopPropagation();
                void toggleFullscreen();
              }}
            >
              <Icon name={fullscreen ? "compress" : "expand"} size={16} />
            </button>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}
