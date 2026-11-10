import { useCallback, useRef, useState } from "react";
import type { ExamTest } from "@/entities/test/types";
import { normalizeTestSettings, withNormalizedSettings } from "@/entities/test/settings";
import { errorMessage } from "@/shared/api/client";
import type { SaveState } from "@/shared/ui/SaveIndicator";
import { testsApi, type TestMetaInput } from "@/features/tests/testsApi";

function mergeMeta(test: ExamTest, pending: Partial<TestMetaInput>): TestMetaInput {
  return {
    title: pending.title ?? test.title,
    description: pending.description ?? test.description,
    settings: normalizeTestSettings({
      ...test.settings,
      ...(pending.settings ?? {}),
    }),
  };
}

export function useTestMeta(test: ExamTest | undefined, onSaved: (test: ExamTest) => void) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<Partial<TestMetaInput>>({});
  const latest = useRef(test);
  latest.current = test;

  const apply = useCallback((next: ExamTest) => {
    onSaved(withNormalizedSettings(next));
  }, [onSaved]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const current = latest.current;
    if (!current || Object.keys(pending.current).length === 0) {
      return true;
    }
    const patch = pending.current;
    pending.current = {};
    const input = mergeMeta(current, patch);
    if (!input.title.trim()) {
      pending.current = { ...patch, ...pending.current };
      setState("error");
      setError("Укажите название теста");
      return false;
    }
    setState("saving");
    try {
      apply(await testsApi.update(current.id, input));
      setState("saved");
      setError("");
      return true;
    } catch (failure) {
      pending.current = { ...patch, ...pending.current };
      setState("error");
      setError(errorMessage(failure, "Не удалось сохранить настройки теста"));
      return false;
    }
  }, [apply]);

  const change = useCallback((patch: Partial<TestMetaInput>, delay = 0) => {
    const current = latest.current;
    if (!current) {
      return;
    }
    const nextPending: Partial<TestMetaInput> = {
      ...pending.current,
      ...patch,
    };
    if (patch.settings) {
      nextPending.settings = {
        ...current.settings,
        ...(pending.current.settings ?? {}),
        ...patch.settings,
      };
    }
    pending.current = nextPending;
    window.clearTimeout(timer.current);
    const optimistic = mergeMeta(current, pending.current);
    apply({ ...current, ...optimistic });
    latest.current = { ...current, ...optimistic };
    setState("saving");
    timer.current = window.setTimeout(() => void flush(), delay);
  }, [apply, flush]);

  return { state, error, change, flush };
}
