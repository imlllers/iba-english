import type { Question } from "@/entities/question/types";
import { Switch } from "@/shared/ui/Switch";
import { NumberField } from "../widgets/NumberField";

type ScoreFieldProps = {
  question: Question;
  update: (patch: Partial<Question>) => void;
  field: string;
  label: string;
  step?: number;
  hint?: string;
};

export function ScoreField({ question, update, field, label, step = 0.5, hint }: ScoreFieldProps) {
  const value = question.scoringConfig[field];
  return (
    <NumberField
      label={label}
      withAsterisk
      value={typeof value === "number" ? value : undefined}
      step={step}
      max={1000}
      hint={hint}
      onChange={(next) => update({ scoringConfig: { ...question.scoringConfig, [field]: next ?? 0 } })}
    />
  );
}

export function ScoreToggle({ question, update, field, label, fallback = false }: Omit<ScoreFieldProps, "step" | "hint"> & { fallback?: boolean }) {
  const value = question.scoringConfig[field];
  const checked = typeof value === "boolean" ? value : fallback;
  return (
    <Switch
      checked={checked}
      onChange={(next) => update({ scoringConfig: { ...question.scoringConfig, [field]: next } })}
      label={label}
    />
  );
}
