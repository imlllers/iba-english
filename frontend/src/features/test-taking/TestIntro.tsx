import { Alert, Box, Button, Card, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ACCESS_DATES_ENABLED } from "@/entities/test/settings";
import type { PublicTest } from "@/entities/test/types";
import { instructionHasContent, toInstructionDoc } from "@/features/question-types/content/instructionDoc";
import { PromptView } from "@/features/question-types/prompt/PromptView";
import { formatDateTime } from "@/shared/lib/format";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { PreventExamCopy } from "./PreventExamCopy";
import { TakeCenteredPage } from "./TakeCenteredPage";
import { TakeHeader } from "./TakeHeader";
import { TOEFL_CARD_CONTENT_TOP_OFFSET } from "./layouts/toefl/toeflCardLayout";

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

function joinParticipantName(first: string, last: string, single?: string) {
  const fromParts = [first.trim(), last.trim()].filter(Boolean).join(" ");
  return fromParts || (single?.trim() ?? "");
}

function toeflIntroTopInsetPx() {
  const vh = window.innerHeight * 0.2;
  return Math.min(Math.max(40, vh), 120);
}

export function TestIntro({ test, starting, error, notice, onStart }: TestIntroProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const examType = test.settings.examType;
  const stackedIntro = examType === "TOEFL" || examType === "TOEIC";
  const runnerLayout = examType === "TOEIC" ? "toeic" : examType === "TOEFL" ? "toefl" : null;
  const needName = true;
  const needEmail = test.settings.requireParticipantEmail !== false;
  const firstNameError = stackedIntro && needName && submitted && !firstName.trim() ? "Enter your first name" : undefined;
  const lastNameError = stackedIntro && needName && submitted && !lastName.trim() ? "Enter your last name" : undefined;
  const nameError = !stackedIntro && needName && submitted && !fullName.trim() ? "Enter your first and last name" : undefined;
  const emailError = needEmail && submitted
    ? (!email.trim() ? "Enter your email" : !emailLooksValid(email.trim()) ? "Enter a valid email" : undefined)
    : undefined;
  const descriptionDoc = toInstructionDoc(test.description);
  const focusLimit = test.settings.focusLossMaxWarnings ?? 0;
  const introCardRef = useRef<HTMLFormElement>(null);
  const introBodyRef = useRef<HTMLDivElement>(null);
  const [compactToeflIntro, setCompactToeflIntro] = useState(false);

  useLayoutEffect(() => {
    if (!stackedIntro) {
      return;
    }
    const card = introCardRef.current;
    const body = introBodyRef.current;
    if (!card || !body) {
      return;
    }
    const measure = () => {
      const topInset = toeflIntroTopInsetPx();
      const overflows = body.scrollHeight + topInset > card.clientHeight - 8;
      setCompactToeflIntro(overflows);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    observer.observe(body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stackedIntro, test.title, test.description, notice, needEmail, focusLimit, error, starting]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const name = joinParticipantName(firstName, lastName, fullName);
    if (needName && !name) {
      return;
    }
    if (needEmail && (!email.trim() || !emailLooksValid(email.trim()))) {
      return;
    }
    onStart(name, email.trim());
  };

  const nameFields = stackedIntro ? (
    <Group gap="md" grow align="flex-start" wrap="wrap">
      <TextInput
        label="First name"
        withAsterisk
        value={firstName}
        maxLength={60}
        autoComplete="given-name"
        placeholder="John"
        error={firstNameError}
        onChange={(event) => setFirstName(event.currentTarget.value)}
      />
      <TextInput
        label="Last name"
        withAsterisk
        value={lastName}
        maxLength={60}
        autoComplete="family-name"
        placeholder="Smith"
        error={lastNameError}
        onChange={(event) => setLastName(event.currentTarget.value)}
      />
    </Group>
  ) : needName ? (
    <TextInput
      label="First and last name"
      withAsterisk
      value={fullName}
      maxLength={120}
      autoComplete="name"
      placeholder="John Smith"
      error={nameError}
      onChange={(event) => setFullName(event.currentTarget.value)}
    />
  ) : null;

  const toeflSectionTitle = (
    <Text
      fw={700}
      ta="center"
      style={{ fontSize: "var(--type-h5-size)", lineHeight: "var(--type-h5-line)" }}
    >
      {test.title}
    </Text>
  );

  const introCopy = (
    <>
      {instructionHasContent(descriptionDoc) ? (
        <Box className="iba-test-copy">
          <PromptView doc={descriptionDoc} />
        </Box>
      ) : null}
      {notice}
      {ACCESS_DATES_ENABLED && test.settings.availableUntil && (
        <SettingsHint>Available until {formatDateTime(test.settings.availableUntil)}</SettingsHint>
      )}
      {focusLimit > 0 && (
        <SettingsHint>
          Do not switch tabs or windows: after {focusLimit} {focusLimit === 1 ? "warning" : "warnings"} your attempt will be submitted automatically
        </SettingsHint>
      )}
    </>
  );

  const identityFields = (
    <>
      {nameFields}
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
    </>
  );

  const formBody = stackedIntro ? (
    <Stack gap="xl" w="100%">
      {toeflSectionTitle}
      <Box maw="var(--runner-toefl-centered-pane-max)" mx="auto" w="100%">
        <Stack gap="md">
          {introCopy}
          {identityFields}
        </Stack>
      </Box>
    </Stack>
  ) : (
    <Stack gap="md">
      <Stack gap={6} align="center" ta="center">
        <Title order={1}>{test.title}</Title>
      </Stack>
      {introCopy}
      {identityFields}
    </Stack>
  );

  if (stackedIntro && runnerLayout) {
    return (
      <Box
        data-runner-layout={runnerLayout}
        style={{
          minHeight: "100vh",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-page)",
          overflow: "hidden",
        }}
      >
        <PreventExamCopy />
        <Box
          component="main"
          id="main"
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            paddingBlock: "var(--space-16)",
            paddingInline: "var(--space-16)",
          }}
        >
          <Box
            className="runner-toefl-workspace"
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              maxWidth: "var(--runner-toefl-card-max)",
              marginInline: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <TakeHeader variant="stacked" tone="iba" />
            <Card
              ref={introCardRef}
              component="form"
              data-take-intro
              w="100%"
              shadow="sm"
              bg="white"
              className="runner-task-card"
              noValidate
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
              onSubmit={submit}
            >
              <Box
                ref={introBodyRef}
                w="100%"
                style={{ paddingTop: compactToeflIntro ? undefined : TOEFL_CARD_CONTENT_TOP_OFFSET }}
              >
                {formBody}
              </Box>
            </Card>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <TakeCenteredPage>
      <PreventExamCopy />
      <Card
        component="form"
        data-take-intro
        w="100%"
        maw={480}
        px="md"
        py="sm"
        bg="white"
        shadow="sm"
        noValidate
        onSubmit={submit}
      >
        {formBody}
      </Card>
    </TakeCenteredPage>
  );
}