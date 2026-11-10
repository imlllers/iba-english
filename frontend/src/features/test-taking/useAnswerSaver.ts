import { useCallback, useEffect, useRef, useState } from "react";
import type { AnswerData } from "@/entities/question/types";
import { ApiError } from "@/shared/api/client";
import type { SaveState } from "@/shared/ui/SaveIndicator";
import { publicApi } from "./publicApi";

const DELAY = 700;
const RETRY = 5000;
const FINAL = new Set(["TIME_EXPIRED", "ALREADY_SUBMITTED"]);
const SKIP = new Set(["SECTION_EXPIRED", "VALIDATION", "NOT_FOUND"]);

export function useAnswerSaver(token: string | null, onFinal: (code: string) => void) {
  const [answers, setAnswers] = useState<Record<string, AnswerData>>({});
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const pending = useRef(new Map<string, AnswerData>());
  const timer = useRef<number | undefined>(undefined);
  const inflight = useRef<Promise<boolean> | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  const flush = useCallback(async (): Promise<boolean> => {
    window.clearTimeout(timer.current);
    if (inflight.current) {
      await inflight.current;
    }
    if (!token || pending.current.size === 0) {
      return pending.current.size === 0;
    }
    const batch = Array.from(pending.current.entries());
    pending.current.clear();
    setState("saving");
    const run = (async () => {
      let retry = false;
      let message = "";
      for (const [questionId, answer] of batch) {
        try {
          await publicApi.saveAnswer(token, questionId, answer);
        } catch (failure) {
          if (failure instanceof ApiError && FINAL.has(failure.code)) {
            finalRef.current(failure.code);
            return false;
          }
          message = "Your answer was not saved";
          if (!(failure instanceof ApiError && SKIP.has(failure.code))) {
            retry = true;
            if (!pending.current.has(questionId)) {
              pending.current.set(questionId, answer);
            }
          }
        }
      }
      if (message) {
        setError(message);
        setState("error");
        if (retry) {
          timer.current = window.setTimeout(() => void flush(), RETRY);
        }
        return !retry;
      }
      setError("");
      setState(pending.current.size ? "saving" : "saved");
      return true;
    })();
    inflight.current = run;
    const result = await run;
    inflight.current = null;
    if (result && pending.current.size) {
      return flush();
    }
    return result;
  }, [token]);

  const setAnswer = useCallback((questionId: string, answer: AnswerData) => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    if (!token) {
      return;
    }
    pending.current.set(questionId, answer);
    setState("saving");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), DELAY);
  }, [token, flush]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current.size) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.clearTimeout(timer.current);
    };
  }, []);

  return { answers, setAnswers, setAnswer, flush, state, error };
}
