import { Alert, Box, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ERROR_EXPLANATIONS_ENABLED, RESULT_DISPLAY_ENABLED } from "@/entities/test/settings";
import { publicApi } from "@/features/test-taking/publicApi";
import { TakeCenteredPage } from "@/features/test-taking/TakeCenteredPage";
import { formatQuestionRange } from "@/features/question-types/numbering";
import { ScaleResultView } from "@/features/score-scales/ScaleResultView";
import { formatScore } from "@/shared/lib/format";
import { Loading } from "@/shared/ui/Loading";
import { MessagePage } from "@/shared/ui/MessagePage";
import { SettingsHint } from "@/shared/ui/SettingsHint";

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
  if (!data.submitted) {
    return <MessagePage title="The attempt is not finished yet">Return to the test using the same link to continue</MessagePage>;
  }
  const wrongExplanations = (ERROR_EXPLANATIONS_ENABLED ? data.explanations ?? [] : []).filter(
    (item) => item.correct === false && item.explanation,
  );
  return (
    <TakeCenteredPage>
      <Box w="100%" maw={480}>
        <Stack gap="md">
          <Stack gap={6} align="center" ta="center">
            <Title order={1}>Test completed</Title>
            <SettingsHint>Your answers have been submitted. You can close this page</SettingsHint>
          </Stack>
          {RESULT_DISPLAY_ENABLED && data.scoreVisible && (
            <Stack gap={0} align="center" ta="center">
              <SettingsHint>Your score</SettingsHint>
              <Text fz="h2" fw={700}>{formatScore(data.score, data.maxScore)}</Text>
            </Stack>
          )}
          {RESULT_DISPLAY_ENABLED && data.scoreVisible && data.scale && <ScaleResultView result={data.scale} showRaw={false} />}
          {RESULT_DISPLAY_ENABLED && data.pendingReview && (
            <SettingsHint ta="center">Some answers need manual review. The final score will appear on this page later</SettingsHint>
          )}
          {wrongExplanations.length > 0 ? (
            <Stack gap="sm">
              <Text fw={600}>Explanations</Text>
              {wrongExplanations.map((item) => (
                <Alert key={item.questionId} color="orange" variant="light" p="sm">
                  <Text size="sm" fw={600} mb={4}>
                    {formatQuestionRange(item.number, item.count)}
                  </Text>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{item.explanation}</Text>
                </Alert>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Box>
    </TakeCenteredPage>
  );
}
