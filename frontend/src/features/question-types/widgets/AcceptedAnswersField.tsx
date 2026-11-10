import { Textarea } from "@mantine/core";
import { useState, type KeyboardEvent } from "react";
import type { TextRule } from "@/entities/question/types";
import { linesRule, ruleLines } from "../content";

type AcceptedAnswersFieldProps = {
  label: string;
  rule: TextRule | undefined;
  onChange: (rule: TextRule) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function AcceptedAnswersField({ label, rule, onChange, onKeyDown }: AcceptedAnswersFieldProps) {
  const [text, setText] = useState(() => ruleLines(rule));

  return (
    <Textarea
      label={label}
      withAsterisk
      value={text}
      placeholder="Введите варианты, каждый с новой строки"
      onChange={(event) => {
        setText(event.currentTarget.value);
        onChange(linesRule(event.currentTarget.value, rule));
      }}
      onKeyDown={onKeyDown}
    />
  );
}
