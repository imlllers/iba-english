import { Alert, Button, Card, Stack, TextInput, Title } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { ACCESS_DATES_ENABLED } from "@/entities/test/settings";
import type { PublicTest } from "@/entities/test/types";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { PromptView } from "@/features/question-types/prompt/PromptView";
import { formatDateTime } from "@/shared/lib/format";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { TakeCenteredPage } from "./TakeCenteredPage";

type TestIntroProps = {
  test: PublicTest;
  starting: boolean;
  error?: string;
  notice?: ReactNode;
  onStart: (name: string, email: string) => void;
};

function emailLooksValid(value: string) {
  const at = value.indexOf("@");
  return at > 0 && at < value.length - 1 && value.indexOf("@", at + 1) < 0;
}

export function TestIntro({ test, starting, error, notice, onStart }: TestIntroProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const needName = true;
  const needEmail = test.settings.requireParticipantEmail !== false;
  const nameError = needName && submitted && !name.trim() ? "Enter your first and last name" : undefined;
  const emailError = needEmail && submitted
    ? (!email.trim() ? "Enter your email" : !emailLooksValid(email.trim()) ? "Enter a valid email" : undefined)
    : undefined;
  const descriptionDoc = toInstructionDoc(test.description);

  const focusLimit = test.settings.focusLossMaxWarnings ?? 0;

  return (
    <TakeCenteredPage>
      <Card
        component="form"
        w="100%"
        maw={480}
        px="md"
        py="sm"
        bg="white"
        shadow="sm"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (needName && !name.trim()) {
            return;
          }
          if (needEmail && (!email.trim() || !emailLooksValid(email.trim()))) {
            return;
          }
          onStart(name.trim(), email.trim());
        }}
      >
        <Stack gap="md">
          <Stack gap={6} align="center" ta="center">
            <Title order={1}>{test.title}</Title>
          </Stack>
          {instructionHasContent(descriptionDoc) && <PromptView doc={descriptionDoc} />}
          {notice}
          {ACCESS_DATES_ENABLED && test.settings.availableUntil && (
            <SettingsHint>Available until {formatDateTime(test.settings.availableUntil)}</SettingsHint>
          )}
          {focusLimit > 0 && (
            <SettingsHint>
              Do not switch tabs or windows: after {focusLimit} {focusLimit === 1 ? "warning" : "warnings"} your attempt will be submitted automatically
            </SettingsHint>
          )}
          {needName && (
            <TextInput
              label="First and last name"
              withAsterisk
              value={name}
              maxLength={120}
              autoComplete="name"
              placeholder="John Smith"
              error={nameError}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          )}
          {needEmail && (
            <TextInput
              label="Email"
              withAsterisk
              value={email}
              maxLength={254}
              autoComplete="email"
              type="email"
              placeholder="name@example.com"
              error={emailError}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
          )}
          {error && (
            <Alert color="red" variant="light" role="alert">{error}</Alert>
          )}
          <Button type="submit" loading={starting} fullWidth mt={4}>
            {starting ? "Preparing…" : "Start test"}
          </Button>
        </Stack>
      </Card>
    </TakeCenteredPage>
  );
}
