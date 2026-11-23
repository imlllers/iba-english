import type { ReactNode } from "react";
import { Box, SimpleGrid, Stack } from "@mantine/core";
import type { ExamDisplayType } from "@/entities/test/types";
import type { ScaleResult, ScaleResultSection } from "@/entities/attempt/types";
import { formatNumber } from "@/features/score-scales/scoreScale";
import classes from "./ParticipantScoreDisplay.module.css";

const SECTION_ORDER = ["Reading", "Listening", "Writing", "Speaking"];

function sortSections(sections: ScaleResultSection[], examType?: ExamDisplayType): ScaleResultSection[] {
  if (examType === "TOEIC") {
    return [...sections].sort((a, b) => a.index - b.index);
  }
  return [...sections].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.name);
    const bi = SECTION_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.index - b.index;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function sectionScaleMax(sections: ScaleResultSection[]): number | null {
  if (!sections.length) return null;
  const max = sections[0].max;
  return sections.every((section) => section.max === max) ? max : max;
}

function sumRawScores(sections: ScaleResultSection[]): { raw: number; rawMax: number } | null {
  let raw = 0;
  let rawMax = 0;
  let any = false;
  for (const section of sections) {
    if (section.raw !== null && section.rawMax) {
      raw += section.raw;
      rawMax += section.rawMax;
      any = true;
    }
  }
  return any ? { raw, rawMax } : null;
}

function scoreOfLabel(score: number, max: number): string {
  return `${formatNumber(score)} of ${formatNumber(max)}`;
}

function formatLevelCaption(level: string | null | undefined, scaleTitle?: string): string | null {
  if (!level?.trim()) return null;
  const label = level.trim();
  if (/^[ABC][12]$/i.test(label)) {
    return `CEFR: ${label.toUpperCase()}`;
  }
  const title = scaleTitle?.trim();
  return title ? `${title}: ${label}` : label;
}

type ParticipantOverallScoreProps = {
  value: number;
  max?: number | null;
  secondary?: string | null;
  level?: string | null;
  scaleTitle?: string;
};

export function ParticipantOverallScore({
  value,
  max,
  secondary,
  level,
  scaleTitle,
}: ParticipantOverallScoreProps) {
  const gaugeMax = max != null && max > 0 ? max : null;
  const primary = gaugeMax ? scoreOfLabel(value, gaugeMax) : formatNumber(value);
  const levelLine = formatLevelCaption(level, scaleTitle);

  return (
    <div className={classes.overall}>
      <div className={classes.overallTitle}>Overall Score</div>
      <div className={classes.gaugeWrap}>
        {gaugeMax ? <ScoreArc value={value} max={gaugeMax} /> : null}
        <div className={classes.gaugeCenter}>
          <div className={classes.scaleScore}>{primary}</div>
          {secondary ? <div className={classes.rawScore}>{secondary}</div> : null}
        </div>
      </div>
      {levelLine ? <div className={classes.level}>{levelLine}</div> : null}
    </div>
  );
}

function ScoreArc({ value, max }: { value: number; max: number }) {
  const radius = 64;
  const cx = 100;
  const cy = 100;
  const track = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const length = Math.PI * radius;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const dash = `${length * ratio} ${length}`;

  return (
    <svg className={classes.gaugeSvg} viewBox="0 0 200 120" aria-hidden>
      <path
        d={track}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <path
        d={track}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </svg>
  );
}

function SectionCard({ section }: { section: ScaleResultSection }) {
  let scoreNode: ReactNode;
  if (section.score !== null) {
    scoreNode = scoreOfLabel(section.score, section.max);
  } else if (section.pending) {
    scoreNode = <span className={classes.sectionScoreMuted}>Score coming soon</span>;
  } else {
    scoreNode = <span className={classes.sectionScoreMuted}>–</span>;
  }

  return (
    <Stack gap="xs" align="stretch">
      <div className={classes.sectionLabel}>{section.name}</div>
      <div className={classes.sectionScore}>{scoreNode}</div>
    </Stack>
  );
}

type ParticipantScoreDisplayProps = {
  scale: ScaleResult;
  examType?: ExamDisplayType;
  rawScore?: number | null;
  rawMaxScore?: number | null;
  hideOverall?: boolean;
};

export function ParticipantScoreDisplay({
  scale,
  examType,
  rawScore,
  rawMaxScore,
  hideOverall = false,
}: ParticipantScoreDisplayProps) {
  const sections = sortSections(scale.sections, examType);
  const scaleMax = scale.totalMax ?? sectionScaleMax(sections);
  const rawTotals = sumRawScores(sections);
  const showOverall = !hideOverall && scale.total !== null && scaleMax != null && scaleMax > 0;
  const secondary =
    rawTotals !== null
      ? scoreOfLabel(rawTotals.raw, rawTotals.rawMax)
      : rawScore != null && rawMaxScore
        ? scoreOfLabel(rawScore, rawMaxScore)
        : null;

  return (
    <Box className={classes.root}>
      <Stack gap="lg" align="stretch">
        {showOverall ? (
          <ParticipantOverallScore
            value={scale.total!}
            max={scaleMax}
            secondary={secondary}
            level={scale.level}
            scaleTitle={scale.title}
          />
        ) : null}

        {sections.length > 0 ? (
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" verticalSpacing="md">
            {sections.map((section) => (
              <SectionCard key={section.index} section={section} />
            ))}
          </SimpleGrid>
        ) : null}
      </Stack>
    </Box>
  );
}