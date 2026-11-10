import { Stack, Text } from "@mantine/core";
import type { ExamTest } from "@/entities/test/types";
import { numberQuestionsInTest } from "@/features/question-types/numbering";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { orderedQuestions } from "./sectionParts";
import { summarizeAnswerKey } from "./answerKeySummary";

type TestAnswerKeysProps = {
  test: ExamTest;
};

type FlatLine = { number: number; value: string };

function flatKeyLines(start: number, count: number, question: Parameters<typeof summarizeAnswerKey>[0]): FlatLine[] {
  const lines = summarizeAnswerKey(question);
  if (count > 1) {
    return Array.from({ length: count }, (_, index) => ({
      number: start + index,
      value: lines[index]?.value ?? "–",
    }));
  }
  if (lines.length <= 1) {
    return [{ number: start, value: lines[0]?.value ?? "–" }];
  }
  return [{
    number: start,
    value: lines.map((line) => (line.label ? `${line.label}. ${line.value}` : line.value)).join(" · "),
  }];
}

export function TestAnswerKeys({ test }: TestAnswerKeysProps) {
  const numbered = numberQuestionsInTest(
    test.sections,
    test.settings.questionNumberScope ?? "test",
    test.settings.examType ?? "CUSTOM",
  );
  if (numbered.length === 0) {
    return <SettingsHint>В тесте пока нет заданий</SettingsHint>;
  }

  return (
    <Stack gap="sm">
      {test.sections.map((section) => {
        const questions = orderedQuestions(section);
        if (!questions.length) {
          return null;
        }
        const lines = questions.flatMap((question) => {
          const entry = numbered.find((item) => item.question.id === question.id);
          return entry ? flatKeyLines(entry.start, entry.count, question) : [];
        });
        return (
          <Stack key={section.id} gap="xs" component="section">
            <Text fw={700}>{section.title}</Text>
            <Stack gap={4} component="ol" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {lines.map((line) => (
                <Text key={`${section.id}-${line.number}`} component="li" size="sm">
                  <Text component="span" fw={600} mr={6}>{line.number}.</Text>
                  {line.value === "–"
                    ? <Text component="span" c="dimmed" fs="italic">ключ не задан</Text>
                    : line.value}
                </Text>
              ))}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
