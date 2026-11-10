import { Box, Stack, Text, Title } from "@mantine/core";
import { useLayoutEffect, useRef, useState } from "react";
import type { MatchingOptions } from "@/entities/question/types";
import { letter } from "@/shared/lib/format";
import { Select } from "@/shared/ui/Select";
import { passageFrameStyle } from "../../content/passageFrame";
import { formatQuestionNumber } from "../../numbering";
import type { PlayerProps } from "../types";

const rowStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  columnGap: "0.5rem",
  rowGap: "0.25rem",
  paddingBlock: 4,
  fontSize: "var(--type-body, 1rem)",
} as const;

const bankItemStyle = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  gap: "var(--mantine-spacing-xs)",
  alignItems: "baseline",
  fontSize: "inherit",
} as const;

const measureHostStyle = {
  position: "absolute",
  visibility: "hidden",
  pointerEvents: "none",
  display: "flex",
  width: "max-content",
  gap: "var(--grid-gutter)",
  left: 0,
  top: 0,
} as const;

export function MatchingPlayer({
  question,
  answer,
  onAnswer,
  readOnly,
  startNumber = 1,
  numberFormat = "1",
}: PlayerProps) {
  const options = question.options as MatchingOptions;
  const pairs = (answer.pairs as Record<string, string>) ?? {};
  const right = options.right ?? [];
  const left = options.left ?? [];
  const taken = new Set(Object.values(pairs));
  const leftTitle = options.leftTitle?.trim() ?? "";
  const rightTitle = options.rightTitle?.trim() ?? "";

  const rootRef = useRef<HTMLDivElement>(null);
  const measureLeftRef = useRef<HTMLDivElement>(null);
  const measureBankRef = useRef<HTMLDivElement>(null);
  const [sideBySide, setSideBySide] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const measureLeft = measureLeftRef.current;
    const measureBank = measureBankRef.current;
    if (!root || !measureLeft || !measureBank) return;

    const update = () => {
      const containerW = root.clientWidth;
      if (containerW <= 0) return;
      const half = containerW / 2;
      const gap = Number.parseFloat(getComputedStyle(root).columnGap || getComputedStyle(root).gap) || 0;
      const leftW = measureLeft.scrollWidth;
      const bankW = measureBank.scrollWidth;
      const fitsSideBySide =
        leftW <= half && bankW <= half && leftW + bankW + gap <= containerW;
      setSideBySide(fitsSideBySide);
    };

    const ro = new ResizeObserver(update);
    ro.observe(root);
    update();
    return () => ro.disconnect();
  }, [left, right, leftTitle, rightTitle, startNumber, numberFormat]);

  const statements = (
    <Stack gap="xs" style={{ flex: sideBySide ? "1 1 0" : undefined, minWidth: 0, width: sideBySide ? undefined : "100%" }}>
      {leftTitle ? <Title order={3}>{leftTitle}</Title> : null}
      <Box component="ol" start={startNumber} style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {left.map((item, index) => {
          const number = startNumber + index;
          return (
            <Box key={item.id} component="li" style={rowStyle}>
              <Text fw={700} style={{ flex: "none", fontSize: "inherit", lineHeight: "inherit" }}>
                {formatQuestionNumber(number, numberFormat)}
              </Text>
              <Text fw={500} style={{ flex: "1 1 8rem", minWidth: 0, fontSize: "inherit", lineHeight: "inherit" }}>
                {item.text}
              </Text>
              <Box style={{ flex: "none" }}>
                <Select
                  size="sm"
                  ariaLabel={`Answer for ${number}`}
                  value={pairs[item.id] ?? ""}
                  disabled={readOnly}
                  onChange={(next) => onAnswer({ pairs: { ...pairs, [item.id]: next } })}
                  options={[
                    { value: "", label: "–" },
                    ...right.map((choice, choiceIndex) => ({
                      value: choice.id,
                      label: letter(choiceIndex),
                      disabled: !options.allowReuse && taken.has(choice.id) && pairs[item.id] !== choice.id,
                    })),
                  ]}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );

  const bankInner = (
    <Stack gap="xs">
      {rightTitle ? (
        <Text fw={700} style={{ fontSize: "inherit", lineHeight: "inherit" }}>
          {rightTitle}
        </Text>
      ) : null}
      <Stack gap={6} component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {right.map((choice, index) => (
          <Box key={choice.id} component="li" style={bankItemStyle}>
            <Text fw={700}>{letter(index)}</Text>
            <Text fw={500}>{choice.text}</Text>
          </Box>
        ))}
      </Stack>
    </Stack>
  );

  const bank = (
    <Box
      style={
        sideBySide
          ? {
              ...passageFrameStyle,
              marginInline: 0,
              flex: "0 1 auto",
              maxWidth: "50%",
              minWidth: 0,
            }
          : passageFrameStyle
      }
    >
      {bankInner}
    </Box>
  );

  return (
    <Box
      ref={rootRef}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: sideBySide ? "row" : "column",
        flexWrap: "nowrap",
        alignItems: sideBySide ? "flex-start" : "stretch",
        gap: "var(--grid-gutter)",
      }}
    >
      <Box aria-hidden style={measureHostStyle}>
        <Box ref={measureLeftRef} style={{ width: "max-content" }}>
          <Stack gap="xs">
            {leftTitle ? <Title order={3}>{leftTitle}</Title> : null}
            {left.map((item, index) => {
              const number = startNumber + index;
              return (
                <Box key={item.id} style={{ ...rowStyle, flexWrap: "nowrap", width: "max-content" }}>
                  <Text fw={700} style={{ flex: "none", fontSize: "inherit", whiteSpace: "nowrap" }}>
                    {formatQuestionNumber(number, numberFormat)}
                  </Text>
                  <Text fw={500} style={{ flex: "none", fontSize: "inherit", whiteSpace: "nowrap" }}>
                    {item.text}
                  </Text>
                  <Box style={{ flex: "none", width: 72 }} />
                </Box>
              );
            })}
          </Stack>
        </Box>
        <Box ref={measureBankRef} style={{ width: "max-content" }}>
          <Box style={{ ...passageFrameStyle, marginInline: 0 }}>
            <Stack gap="xs">
              {rightTitle ? (
                <Text fw={700} style={{ fontSize: "inherit", whiteSpace: "nowrap" }}>
                  {rightTitle}
                </Text>
              ) : null}
              {right.map((choice, index) => (
                <Box
                  key={choice.id}
                  style={{
                    display: "flex",
                    flexWrap: "nowrap",
                    gap: "var(--mantine-spacing-xs)",
                    width: "max-content",
                  }}
                >
                  <Text fw={700} style={{ whiteSpace: "nowrap" }}>
                    {letter(index)}
                  </Text>
                  <Text fw={500} style={{ whiteSpace: "nowrap" }}>
                    {choice.text}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>

      {sideBySide ? (
        <>
          {statements}
          {bank}
        </>
      ) : (
        <>
          {bank}
          {statements}
        </>
      )}
    </Box>
  );
}
