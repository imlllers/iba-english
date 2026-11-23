import { Stack, Text, Title } from "@mantine/core";
import type { ParticipantResult } from "@/entities/attempt/types";
import type { ExamDisplayType, ResultDetail } from "@/entities/test/types";
import { normalizeResultDetail, resultShowsScaleSections } from "@/entities/test/resultDisplay";
import { ParticipantOverallScore, ParticipantScoreDisplay } from "@/features/results/ParticipantScoreDisplay";

type ParticipantLiveResultBodyProps = {
  examType: ExamDisplayType;
  resultDetail: ResultDetail;
  showResultToParticipant: boolean;
  emailResultToParticipant: boolean;
  participantEmail?: string | null;
  hasSpeakingSection: boolean;
  scoreVisible: boolean;
  score?: number | null;
  maxScore?: number | null;
  scale?: ParticipantResult["scale"];
};

function liveOverallNumbers(
  scale: ParticipantResult["scale"] | undefined,
  score: number | null | undefined,
  maxScore: number | null | undefined,
): { value: number; max: number | null; level: string | null; scaleTitle?: string } | null {
  if (scale?.total != null) {
    const gaugeMax = scale.totalMax ?? scale.sections[0]?.max ?? null;
    return {
      value: scale.total,
      max: gaugeMax,
      level: scale.level,
      scaleTitle: scale.title,
    };
  }
  if (score == null) {
    return null;
  }
  return {
    value: score,
    max: maxScore ?? null,
    level: scale?.level ?? null,
    scaleTitle: scale?.title,
  };
}

export function ParticipantLiveResultBody({
  examType,
  resultDetail,
  showResultToParticipant,
  emailResultToParticipant,
  participantEmail,
  hasSpeakingSection,
  scoreVisible,
  score,
  maxScore,
  scale,
}: ParticipantLiveResultBodyProps) {
  const detail = normalizeResultDetail(resultDetail);
  const ieltsSpeakingSeparate = examType === "IELTS" && !hasSpeakingSection;
  const showScaleBreakdown = showResultToParticipant && resultShowsScaleSections(detail) && Boolean(scale);
  const showOverallOnly =
    showResultToParticipant && scoreVisible && detail === "score_only" && !ieltsSpeakingSeparate;
  const overall = showOverallOnly ? liveOverallNumbers(scale, score, maxScore) : null;

  return (
    <Stack gap="md" align="center" ta="center" w="100%">
      <Stack gap="sm" align="center" w="100%">
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

      {overall ? (
        <ParticipantOverallScore
          value={overall.value}
          max={overall.max}
          level={overall.level}
          scaleTitle={overall.scaleTitle}
        />
      ) : null}

      {ieltsSpeakingSeparate ? (
        <Text size="md" maw={480}>
          The Speaking section is taken separately. Your overall band score will be available after it
        </Text>
      ) : null}

      {showScaleBreakdown && scale ? (
        <ParticipantScoreDisplay
          scale={scale}
          examType={examType}
          rawScore={score}
          rawMaxScore={maxScore}
          hideOverall={ieltsSpeakingSeparate || detail === "sections_only"}
        />
      ) : null}

      {emailResultToParticipant ? (
        <Text size="md" maw={480}>
          Your result will be sent to{" "}
          {participantEmail?.trim() ? (
            <Text span fw={600}>{participantEmail.trim()}</Text>
          ) : (
            <Text span fw={600}>the email address you provided when starting the test</Text>
          )}
          .
        </Text>
      ) : null}
    </Stack>
  );
}