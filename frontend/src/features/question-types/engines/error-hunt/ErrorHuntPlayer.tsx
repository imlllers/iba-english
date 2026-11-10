import { TextInput } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { Item, SegmentOptions } from "@/entities/question/types";
import { errorCorrectionInputStyles } from "../gapStyles";
import type { PlayerProps } from "../types";
import { SegmentText } from "./SegmentText";

export function ErrorHuntPlayer({ question, answer, onAnswer, readOnly }: PlayerProps) {
  const options = question.options as SegmentOptions;
  const segments = options.segments ?? [];
  const corrections = (answer.corrections as Record<string, string>) ?? {};
  const sentences = question.type === "SENTENCE_ERRORS";
  const focusId = useRef<string | null>(null);

  const toggle = (id: string) => {
    if (readOnly) return;
    const next = { ...corrections };
    if (id in next) {
      delete next[id];
      focusId.current = null;
    } else {
      next[id] = "";
      focusId.current = id;
    }
    onAnswer({ corrections: next });
  };

  useEffect(() => {
    const id = focusId.current;
    if (!id || !(id in corrections)) return;
    document.getElementById(`error-fix-${id}`)?.focus();
    focusId.current = null;
  }, [corrections]);

  const renderCorrection = (segment: Item) => (
    <TextInput
      id={`error-fix-${segment.id}`}
      aria-label={`Correction for “${segment.text}”`}
      value={corrections[segment.id] ?? ""}
      readOnly={readOnly}
      autoComplete="off"
      spellCheck={false}
      styles={errorCorrectionInputStyles}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onAnswer({ corrections: { ...corrections, [segment.id]: event.target.value } })}
    />
  );

  return (
    <SegmentText
      label={sentences ? "Sentence" : "Text"}
      tone="error"
      segments={segments}
      isOn={(id) => id in corrections}
      onToggle={readOnly ? undefined : toggle}
      renderAfter={(segment) => (segment.id in corrections ? renderCorrection(segment) : null)}
    />
  );
}
