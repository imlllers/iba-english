import { IeltsRunner } from "./layouts/ielts/IeltsRunner";
import { runnerLayoutOf } from "./layouts/runnerLayout";
import { ToeflRunner } from "./layouts/toefl/ToeflRunner";
import type { TestRunnerProps } from "./runnerTypes";

export type { TestRunnerProps };

export function TestRunner(props: TestRunnerProps) {
  switch (runnerLayoutOf(props.test.settings.examType)) {
    case "toefl":
      return <ToeflRunner {...props} />;
    case "toeic":
      return <IeltsRunner {...props} />;
    case "ielts":
      return <IeltsRunner {...props} />;
  }
}
