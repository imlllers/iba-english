import { Box } from "@mantine/core";
import type { Doc } from "@/entities/question/types";
import type { ExamDisplayType } from "@/entities/test/types";
import { PromptView } from "@/features/question-types/prompt/PromptView";

export type InstructionScope = "section" | "part" | "block";

export function instructionScopeHeading(
  examType: ExamDisplayType | null | undefined,
  scope: InstructionScope,
): string | null {
  if (examType === "TOEIC" && scope === "part") {
    return "Directions";
  }
  return null;
}

type ScopeInstructionViewProps = {
  doc: Doc;
  examType?: ExamDisplayType | null;
  scope: InstructionScope;
};

const bodyStyle = { fontSize: "var(--type-body, 1rem)", fontWeight: 500 } as const;

export function ScopeInstructionView({
  doc,
  examType = "CUSTOM",
  scope,
}: ScopeInstructionViewProps) {
  const toeicPart = examType === "TOEIC" && scope === "part";
  return (
    <Box
      className={toeicPart ? "iba-test-copy runner-toeic-directions" : "iba-test-copy"}
      style={bodyStyle}
    >
      <PromptView doc={doc} />
    </Box>
  );
}