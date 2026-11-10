import type { PlayerProps } from "../types";
import { VoiceRecorder } from "./VoiceRecorder";

export function SpeakingPlayer({ question, answer, onAnswer, readOnly }: PlayerProps) {
  return (
    <VoiceRecorder
      value={{ mediaId: answer.mediaId as string | undefined, durationSeconds: answer.durationSeconds as number | undefined }}
      maxSeconds={question.settings.maxSeconds ?? 120}
      preparationSeconds={question.settings.preparationSeconds ?? 0}
      readOnly={readOnly}
      onChange={(value) => onAnswer(value)}
    />
  );
}
