import { Box } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { normalizeExamDisplayType } from "@/entities/test/settings";
import { effectiveResultDetail, normalizeResultDetail } from "@/entities/test/resultDisplay";
import { publicApi } from "@/features/test-taking/publicApi";
import { ToeflTakeShell } from "@/features/test-taking/layouts/toefl/ToeflTakeShell";
import { stackedLayoutOf, usesStackedTakeChrome } from "@/features/test-taking/layouts/runnerLayout";
import { TakeCenteredPage } from "@/features/test-taking/TakeCenteredPage";
import { ParticipantLiveResultBody } from "@/features/results/ParticipantLiveResultBody";
import { Loading } from "@/shared/ui/Loading";
import { MessagePage } from "@/shared/ui/MessagePage";

export function AttemptResultPage() {
  const { attemptToken = "" } = useParams();
  const result = useQuery({ queryKey: ["attempt-result", attemptToken], queryFn: () => publicApi.result(attemptToken) });

  if (result.isLoading) {
    return <Loading fullPage text="Loading the result…" />;
  }
  if (result.isError || !result.data) {
    return <MessagePage title="Result unavailable">The attempt was not found</MessagePage>;
  }
  const data = result.data;
  const examType = normalizeExamDisplayType(data.examType);
  if (!data.submitted) {
    return <MessagePage title="The attempt is not finished yet">Return to the test using the same link to continue</MessagePage>;
  }
  const resultDetail = effectiveResultDetail(
    normalizeResultDetail(data.resultDetail),
    Boolean(data.scale),
  );
  const body = (
    <Box
      w="100%"
      maw={
        usesStackedTakeChrome(examType)
          ? "var(--runner-toefl-centered-pane-max)"
          : (resultDetail === "score_and_scale" || resultDetail === "sections_only") && data.scale
            ? 560
            : 480
      }
    >
      <ParticipantLiveResultBody
        examType={examType}
        resultDetail={resultDetail}
        showResultToParticipant={data.showResultToParticipant !== false}
        emailResultToParticipant={Boolean(data.emailResultToParticipant)}
        participantEmail={data.participantEmail}
        hasSpeakingSection={data.hasSpeakingSection !== false}
        scoreVisible={Boolean(data.scoreVisible)}
        score={data.score}
        maxScore={data.maxScore}
        scale={data.scale}
      />
    </Box>
  );

  if (usesStackedTakeChrome(examType)) {
    return (
      <ToeflTakeShell layout={stackedLayoutOf(examType)} centerContent>
        {body}
      </ToeflTakeShell>
    );
  }

  return <TakeCenteredPage>{body}</TakeCenteredPage>;
}