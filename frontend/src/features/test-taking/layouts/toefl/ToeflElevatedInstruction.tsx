import { Box } from "@mantine/core";
import type { Doc } from "@/entities/question/types";
import { PromptView } from "@/features/question-types/prompt/PromptView";

type ToeflElevatedInstructionProps = {
  doc: Doc;
  pageLead?: boolean;
};

export function ToeflElevatedInstruction({ doc, pageLead = true }: ToeflElevatedInstructionProps) {
  return (
    <Box
      className={`iba-test-copy runner-group-instruction${pageLead ? " runner-group-instruction-page" : ""}`}
    >
      <PromptView doc={doc} />
    </Box>
  );
}