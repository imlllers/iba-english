import { Box, Image, Radio, Stack, Text } from "@mantine/core";
import type { PartExample, PartExampleBlock } from "@/entities/test/types";
import { AppAudio } from "@/shared/ui/AppAudio";
import { letter } from "@/shared/lib/format";
import { PromptView } from "../prompt/PromptView";
import { instructionHasContent, toInstructionDoc } from "./instructionDoc";
import { partExampleFilled } from "./partExample";
import { TASK_MEDIA_ROW } from "./taskMediaLayout";
import { useMedia } from "../media/MediaContext";

type PartExampleViewProps = {
  example: PartExample | null | undefined;
  hideAudio?: boolean;
  framed?: boolean;
};

function ChoicesPreview({ block }: { block: Extract<PartExampleBlock, { kind: "choices" }> }) {
  return (
    <Stack gap="xs" component="ul" className="iba-choice-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {block.options.map((option, index) => {
        const checked = option.id === block.correctId;
        return (
          <Box key={option.id} component="li">
            <Radio
              checked={checked}
              disabled
              readOnly
              label={(
                <>
                  <Text component="span" fw={500} mr="xs">
                    ({letter(index)})
                  </Text>
                  <Text component="span" fw={500}>{option.text}</Text>
                </>
              )}
              styles={{
                body: { alignItems: "center" },
                label: { fontSize: "var(--type-body, 1rem)", fontWeight: 500, lineHeight: "var(--mantine-line-height-md)" },
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

export function PartExampleView({ example, hideAudio = false, framed = true }: PartExampleViewProps) {
  const media = useMedia();
  if (!partExampleFilled(example)) {
    return null;
  }
  const blocks = example!.blocks;
  return (
    <Box
      className={framed ? "runner-part-example iba-test-copy" : "runner-part-example runner-part-example--unframed iba-test-copy"}
      style={{ fontWeight: 500, fontSize: "var(--type-body, 1rem)" }}
    >
      <Text fw={700} mb="sm" style={{ fontSize: "var(--type-body, 1rem)", lineHeight: "var(--mantine-line-height-md)" }}>
        Example
      </Text>
      <Stack gap="md">
        {blocks.map((block) => {
          if (block.kind === "text") {
            const doc = toInstructionDoc(block.doc);
            if (!instructionHasContent(doc)) {
              return null;
            }
            return <PromptView key={block.id} doc={doc} />;
          }
          if (block.kind === "image" && block.mediaId) {
            return (
              <Box key={block.id} className="iba-task-media" style={TASK_MEDIA_ROW}>
                <Image src={media.asset(block.mediaId)} alt="" radius="sm" fit="contain" maw="min(100%, var(--runner-task-media-width, 480px))" mah="var(--runner-task-media-height, 360px)" />
              </Box>
            );
          }
          if (block.kind === "audio" && block.mediaId) {
            if (hideAudio) {
              return null;
            }
            return (
              <Box key={block.id}>
                <AppAudio src={media.asset(block.mediaId)} maw="100%" aria-label="Audio" />
              </Box>
            );
          }
          if (block.kind === "choices") {
            return <ChoicesPreview key={block.id} block={block} />;
          }
          return null;
        })}
      </Stack>
    </Box>
  );
}