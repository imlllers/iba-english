import { Badge, Group, Stack, Text, Title } from "@mantine/core";
import type { ParticipantResult } from "@/entities/attempt/types";
import type { ExamDisplayType, ResultDetail, TestSettings } from "@/entities/test/types";
import { resultDisplayEnabled } from "@/entities/test/settings";
import { normalizeResultDetail, resultShowsOverall, resultShowsScaleSections } from "@/entities/test/resultDisplay";
import { ScaleResultView } from "@/features/score-scales/ScaleResultView";
import { formatNumber } from "@/features/score-scales/scoreScale";
import { formatScore } from "@/shared/lib/format";
import { SettingsHint } from "@/shared/ui/SettingsHint";

function ParticipantScaleOverall({
  result,
  examType,
}: {
  result: NonNullable<ParticipantResult["scale"]>;
  examType: ExamDisplayType;
}) {
  const speakingGap = examType === "IELTS"
    && result.sections.some((section) => section.name === "Speaking" && section.score === null)
    && result.sections.some((section) => section.name !== "Speaking" && section.score !== null)
    && result.total === null;

  if (speakingGap) {
    return <SettingsHint ta="center">Overall: нет оценки за Speaking</SettingsHint>;
  }
  if (result.total !== null) {
    return (
      <Group gap="md" justify="center" align="center">
        <Text ta="center">
          Total ({result.title}):{" "}
          <Text span fw={700}>{formatNumber(result.total)}</Text>
        </Text>
        {result.level ? <Badge size="lg">{result.level}</Badge> : null}
      </Group>
    );
  }
  return (
    <SettingsHint ta="center">The total and level will appear when all sections are scored</SettingsHint>
  );
}

export function ParticipantResultBody({
  examType,
  resultDetail,
  scoreVisible,
  score,
  maxScore,
  scale,
  previewNote,
}: {
  examType: ExamDisplayType;
  resultDetail: ResultDetail;
  scoreVisible: boolean;
  score?: number | null;
  maxScore?: number | null;
  scale?: ParticipantResult["scale"];
  pendingReview?: boolean;
  previewNote?: string;
}) {
  const showScores = resultDisplayEnabled(examType);
  const detail = normalizeResultDetail(resultDetail);
  const showSections = showScores && scoreVisible && resultShowsScaleSections(detail) && Boolean(scale);
  const showOverallFromScale = showScores && scoreVisible && scale && resultShowsOverall(detail) && detail === "score_and_scale";
  const showRawScore = showScores && scoreVisible && detail === "score_only";

  return (
    <Stack gap="md">
      {previewNote ? (
        <SettingsHint ta="center">{previewNote}</SettingsHint>
      ) : null}
      <Stack gap="sm" align="center" ta="center">
        {examType === "TOEFL" ? (
          <Text
            fw={700}
            style={{ fontSize: "var(--type-h5-size)", lineHeight: "var(--type-h5-line)" }}
          >
            Test completed
          </Text>
        ) : (
          <Title order={1}>Test completed</Title>
        )}
        <Text size="md" ta="center">
          Your answers have been submitted. You can close this page
        </Text>
      </Stack>
      {showRawScore ? (
        <Stack gap={0} align="center" ta="center">
          <SettingsHint>Your score</SettingsHint>
          <Text fz="h2" fw={700}>{formatScore(score, maxScore)}</Text>
        </Stack>
      ) : null}
      {showOverallFromScale ? <ParticipantScaleOverall result={scale} examType={examType} /> : null}
      {showSections && scale ? (
        <ScaleResultView
          result={scale}
          showRaw={false}
          examType={examType}
          participant
          hideOverall={detail === "sections_only"}
        />
      ) : null}
    </Stack>
  );
}

export function mockPreviewScale(settings: TestSettings): ParticipantResult["scale"] | undefined {
  const binding = settings.scoreScale;
  if (!binding?.scale) {
    return undefined;
  }
  const scale = binding.scale;
  const ielts = settings.examType === "IELTS";
  const sections = scale.sections.map((section, index) => {
    const speaking = ielts && section.sectionType === "SPEAKING";
    return {
      index,
      name: section.name,
      method: section.convert?.method ?? "linear",
      min: section.min,
      max: section.max,
      step: section.step,
      testSectionTitle: section.name,
      raw: null,
      rawMax: null,
      score: speaking ? null : 6.5,
      pending: speaking,
    };
  });
  const speakingOpen = sections.some((section) => section.pending && section.score === null);
  return {
    title: scale.title,
    sections,
    total: speakingOpen && ielts ? null : 7,
    level: speakingOpen && ielts ? null : "B2",
    complete: !(speakingOpen && ielts),
  };
}