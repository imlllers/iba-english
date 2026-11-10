import { TextInput } from "@mantine/core";
import type { TextAnswerMode } from "@/entities/question/types";
import type { PlayerProps } from "../types";

const INPUT: Record<TextAnswerMode, { type: string; inputMode?: "decimal" | "text"; label: string }> = {
  TEXT: { type: "text", inputMode: "text", label: "Answer" },
  NUMBER: { type: "text", inputMode: "decimal", label: "Number" },
  DATE: { type: "date", label: "Date" },
  TIME: { type: "time", label: "Time" },
};

export function TextAnswerPlayer({ question, answer, onAnswer, readOnly }: PlayerProps) {
  const mode = ((question.options as { mode?: TextAnswerMode })?.mode ?? "TEXT") as TextAnswerMode;
  const config = INPUT[mode] ?? INPUT.TEXT;
  return (
    <TextInput
      type={config.type}
      inputMode={config.inputMode}
      aria-label={config.label}
      value={String(answer.text ?? "")}
      readOnly={readOnly}
      autoComplete="off"
      onChange={(event) => onAnswer({ text: event.target.value })}
    />
  );
}
