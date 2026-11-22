import { TextInput, type TextInputProps } from "@mantine/core";
import { useEffect, useState } from "react";
import { mmSsToSeconds, secondsToMmSs } from "@/shared/lib/durationMmSs";

function display(totalSeconds: number): string {
  return totalSeconds > 0 ? secondsToMmSs(totalSeconds) : "";
}

export function MmSsTimeInput({
  totalSeconds,
  onCommit,
  ...rest
}: {
  totalSeconds: number;
  onCommit: (next: number | null) => void;
} & Omit<TextInputProps, "value" | "onChange">) {
  const [text, setText] = useState(() => display(totalSeconds));

  useEffect(() => {
    setText(display(totalSeconds));
  }, [totalSeconds]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onCommit(null);
      return;
    }
    const next = mmSsToSeconds(raw);
    if (next == null) {
      setText(display(totalSeconds));
      return;
    }
    onCommit(next);
  };

  return (
    <TextInput
      {...rest}
      value={text}
      onChange={(event) => setText(event.currentTarget.value)}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={(event) => {
        rest.onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        commit(event.currentTarget.value);
        event.currentTarget.blur();
      }}
    />
  );
}
