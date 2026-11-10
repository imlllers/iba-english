import type { JudgementOptions } from "@/entities/question/types";
import { newId } from "@/shared/lib/ids";
import { judgementLabels, judgementText } from "../../registry";
import { SegmentedChoice } from "../../widgets/SegmentedChoice";
import type { EditorProps } from "../types";

function statementId(options: JudgementOptions, questionId: string) {
  return options.statements?.[0]?.id ?? `${questionId}-statement`;
}

export function JudgementContent({ question, update, startNumber = 1 }: EditorProps) {
  const options = question.options as JudgementOptions;
  const answers = (question.answerKey.answers as Record<string, string>) ?? {};
  const labels = judgementLabels(question.type).map((value) => ({ value, label: judgementText(value) }));
  const id = statementId(options, question.id);

  return (
    <SegmentedChoice
      label={`Ответ для задания ${startNumber}`}
      withAsterisk
      options={labels}
      value={answers[id] ?? ""}
      onChange={(value) => {
        const current = options.statements?.[0];
        const statementId = current?.id ?? id ?? newId();
        update({
          options: {
            ...options,
            statements: [{ id: statementId, text: current?.text ?? "" }],
          },
          answerKey: { answers: { [statementId]: value } },
        });
      }}
    />
  );
}
