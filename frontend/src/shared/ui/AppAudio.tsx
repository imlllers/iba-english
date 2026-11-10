import { Audio, type AudioProps } from "@gfazioli/mantine-audio";
import type { ComponentProps } from "react";

type TimeDisplayProps = ComponentProps<typeof Audio.TimeDisplay>;

function AppAudioTimeDisplay(props: TimeDisplayProps) {
  return (
    <Audio.TimeDisplay
      ff="var(--mantine-font-family)"
      {...props}
      style={{ fontVariantNumeric: "tabular-nums", ...props.style }}
    />
  );
}

export function AppAudio({
  size = "sm",
  variant = "bordered",
  color = "iba",
  preload = "metadata",
  crossOrigin = "",
  maw = 420,
  w = "100%",
  children,
  ...rest
}: AudioProps) {
  return (
    <Audio
      size={size}
      variant={variant}
      color={color}
      preload={preload}
      crossOrigin={crossOrigin}
      maw={maw}
      w={w}
      {...rest}
    >
      {children ?? (
        <Audio.Controls>
          <Audio.PlayButton />
          <Audio.Timeline />
          <AppAudioTimeDisplay />
        </Audio.Controls>
      )}
    </Audio>
  );
}

AppAudio.Controls = Audio.Controls;
AppAudio.PlayButton = Audio.PlayButton;
AppAudio.Timeline = Audio.Timeline;
AppAudio.TimeDisplay = AppAudioTimeDisplay;
