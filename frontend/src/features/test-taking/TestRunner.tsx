import { useEffect, useMemo } from "react";
import { withNormalizedSettings } from "@/entities/test/settings";
import { resetSpeakingMic } from "@/features/question-types/engines/speaking/speakingMic";
import { PreventExamCopy } from "./PreventExamCopy";
import { IeltsRunner } from "./layouts/ielts/IeltsRunner";
import { runnerLayoutOf } from "./layouts/runnerLayout";
import { ToeflRunner } from "./layouts/toefl/ToeflRunner";
import type { TestRunnerProps } from "./runnerTypes";

export type { TestRunnerProps };

export function TestRunner(props: TestRunnerProps) {
  const test = useMemo(() => withNormalizedSettings(props.test), [props.test]);
  const runnerProps = { ...props, test };
  const runner = runnerLayoutOf(test.settings.examType) === "toefl"
    ? <ToeflRunner {...runnerProps} />
    : <IeltsRunner {...runnerProps} />;
  useEffect(() => () => {
    resetSpeakingMic();
  }, []);
  return (
    <>
      <PreventExamCopy />
      {runner}
    </>
  );
}
