import { PreventExamCopy } from "./PreventExamCopy";
import { IeltsRunner } from "./layouts/ielts/IeltsRunner";
import { runnerLayoutOf } from "./layouts/runnerLayout";
import { ToeflRunner } from "./layouts/toefl/ToeflRunner";
import type { TestRunnerProps } from "./runnerTypes";

export type { TestRunnerProps };

export function TestRunner(props: TestRunnerProps) {
  const runner = runnerLayoutOf(props.test.settings.examType) === "toefl"
    ? <ToeflRunner {...props} />
    : <IeltsRunner {...props} />;
  return (
    <>
      <PreventExamCopy />
      {runner}
    </>
  );
}
