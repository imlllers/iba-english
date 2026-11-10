import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/entities/question/types";
import type { ExamTest } from "@/entities/test/types";
import { errorMessage } from "@/shared/api/client";
import type { SaveState } from "@/shared/ui/SaveIndicator";
import { testsApi } from "@/features/tests/testsApi";

const DELAY = 800;
const backupKey = (id: string) => `iba-question-backup:${id}`;

function readBackup(question: Question) {
  const raw = localStorage.getItem(backupKey(question.id));
  if (!raw) {
    return null;
  }
  try {
    const backup = JSON.parse(raw) as Question;
    return backup.id === question.id && backup.type === question.type ? backup : null;
  } catch {
    return null;
  }
}

export function useQuestionDraft(testId: string, onSaved: (test: ExamTest) => void) {
  const [draft, setDraft] = useState<Question | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [backup, setBackup] = useState<Question | null>(null);
  const current = useRef<Question | null>(null);
  const dirty = useRef(false);
  const version = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const saving = useRef<Promise<boolean> | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
    window.clearTimeout(timer.current);
    if (saving.current) {
      await saving.current;
    }
    const question = current.current;
    if (!question || !dirty.current) {
      return true;
    }
    const sent = version.current;
    setState("saving");
    const request = testsApi.updateQuestion(testId, question).then(
      (test) => {
        if (version.current === sent) {
          dirty.current = false;
          setState("saved");
          localStorage.removeItem(backupKey(question.id));
        }
        setError("");
        onSaved(test);
        return true;
      },
      (failure: unknown) => {
        localStorage.setItem(backupKey(question.id), JSON.stringify(question));
        setState("error");
        setError(errorMessage(failure, "Не удалось сохранить задание"));
        return false;
      },
    );
    saving.current = request;
    const result = await request;
    saving.current = null;
    if (result && dirty.current && version.current !== sent) {
      timer.current = window.setTimeout(() => void save(), DELAY);
    }
    return result;
  }, [testId, onSaved]);

  const update = useCallback((patch: Partial<Question>) => {
    const base = current.current;
    if (!base) {
      return;
    }
    const next = { ...base, ...patch };
    current.current = next;
    dirty.current = true;
    version.current += 1;
    setDraft(next);
    setState("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), DELAY);
  }, [save]);

  const load = useCallback(async (question: Question | null) => {
    window.clearTimeout(timer.current);
    const previous = current.current;
    const snapshot = dirty.current && previous && previous.id !== question?.id ? previous : null;

    current.current = question;
    dirty.current = false;
    setDraft(question);
    setBackup(question ? readBackup(question) : null);
    setState((value) => (value === "error" ? "idle" : value));

    if (snapshot) {
      setState("saving");
      const sent = version.current;
      void testsApi.updateQuestion(testId, snapshot).then(
        (test) => {
          if (version.current === sent && !dirty.current) {
            setState("saved");
          }
          setError("");
          onSaved(test);
        },
        (failure: unknown) => {
          localStorage.setItem(backupKey(snapshot.id), JSON.stringify(snapshot));
          setState("error");
          setError(errorMessage(failure, "Не удалось сохранить задание"));
        },
      );
    }
    return true;
  }, [testId, onSaved]);

  const restoreBackup = useCallback(() => {
    if (backup) {
      update({
        promptContent: backup.promptContent,
        options: backup.options,
        answerKey: backup.answerKey,
        scoringConfig: backup.scoringConfig,
        required: backup.required,
        settings: backup.settings,
      });
      setBackup(null);
    }
  }, [backup, update]);

  const discardBackup = useCallback(() => {
    if (backup) {
      localStorage.removeItem(backupKey(backup.id));
      setBackup(null);
    }
  }, [backup]);

  const forget = useCallback(() => {
    window.clearTimeout(timer.current);
    if (current.current) {
      localStorage.removeItem(backupKey(current.current.id));
    }
    current.current = null;
    dirty.current = false;
    setDraft(null);
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.clearTimeout(timer.current);
    };
  }, []);

  return { draft, state, error, backup, update, save, load, forget, restoreBackup, discardBackup };
}
