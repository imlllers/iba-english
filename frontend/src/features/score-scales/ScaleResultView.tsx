import { Badge, Group, NumberInput, Stack, Table, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import type { ScaleResult, ScaleResultSection } from "@/entities/attempt/types";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import { formatNumber } from "./scoreScale";

export function ManualScore({ section, compact = false, onSave }: { section: ScaleResultSection; compact?: boolean; onSave: (score: number | null) => void }) {
  const [value, setValue] = useState<number | string>(section.score ?? "");
  useEffect(() => setValue(section.score ?? ""), [section.score]);
  const parsed = value === "" ? null : Number(value);
  const next = parsed !== null && Number.isFinite(parsed) && parsed >= section.min && parsed <= section.max ? parsed : null;
  const invalid = value !== "" && next === null;
  useEffect(() => {
    if (invalid || next === section.score) return;
    const timer = window.setTimeout(() => onSave(next), 600);
    return () => window.clearTimeout(timer);
  }, [next, invalid, section.score]);
  return (
    <NumberInput
      size={compact ? "xs" : "sm"}
      w={compact ? 72 : 100}
      styles={compact ? { input: { fontSize: "inherit" } } : undefined}
      aria-label={`Балл шкалы: ${section.name}`}
      placeholder={`${formatNumber(section.min)}-${formatNumber(section.max)}`}
      value={value}
      min={section.min}
      max={section.max}
      step={section.step}
      clampBehavior="strict"
      decimalScale={Number.isInteger(section.step) ? 0 : 2}
      error={invalid ? `${formatNumber(section.min)}-${formatNumber(section.max)}` : undefined}
      onChange={setValue}
    />
  );
}

function ieltsSpeakingOverallHint(result: ScaleResult, examType?: string, participant?: boolean): string | null {
  if (!participant || examType !== "IELTS") {
    return null;
  }
  const speaking = result.sections.find((section) => section.name === "Speaking");
  if (!speaking || speaking.score !== null) {
    return null;
  }
  const othersScored = result.sections
    .filter((section) => section.name !== "Speaking")
    .some((section) => section.score !== null);
  if (!othersScored || result.total !== null) {
    return null;
  }
  return "Overall: нет оценки за Speaking";
}

export function ScaleResultView({ result, onManual, showRaw = true, examType, participant = false, hideOverall = false }: {
  result: ScaleResult;
  onManual?: (index: number, score: number | null) => void;
  showRaw?: boolean;
  examType?: string;
  participant?: boolean;
  hideOverall?: boolean;
}) {
  const overallHint = ieltsSpeakingOverallHint(result, examType, participant);
  return (
    <Stack gap="sm">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Section</Table.Th>
            {showRaw && <Table.Th ta="center">Баллы за задания</Table.Th>}
            <Table.Th ta="center">{result.title}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {result.sections.map((section) => (
            <Table.Tr key={section.index}>
              <Table.Td>
                <Text fw={600}>{section.name}</Text>
                {showRaw && section.testSectionTitle && section.testSectionTitle !== section.name ? (
                  <SettingsHint>{section.testSectionTitle}</SettingsHint>
                ) : null}
              </Table.Td>
              {showRaw && (
                <Table.Td ta="center">
                  {section.raw === null || !section.rawMax ? "–" : `${formatNumber(section.raw)} / ${formatNumber(section.rawMax)}`}
                </Table.Td>
              )}
              <Table.Td ta="center">
                {section.method === "manual" && onManual ? (
                  <Group justify="center"><ManualScore section={section} onSave={(score) => onManual(section.index, score)} /></Group>
                ) : section.score !== null ? (
                  <Text fw={600}>{formatNumber(section.score)}</Text>
                ) : (
                  <Text c="dimmed">{section.pending ? "pending review" : "–"}</Text>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {hideOverall ? null : (
        <Group gap="md" align="center">
          {result.total !== null ? (
            <>
              <Text>Total: <Text span fw={700}>{formatNumber(result.total)}</Text></Text>
              {result.level ? (
                <Badge size="lg">{result.level}</Badge>
              ) : result.hasLevels !== false ? (
                <SettingsHint>The total does not match any level of the scale</SettingsHint>
              ) : null}
            </>
          ) : overallHint ? (
            <SettingsHint>{overallHint}</SettingsHint>
          ) : (
            <SettingsHint>
              {result.hasLevels !== false
                ? "The total and level will appear when all sections are scored"
                : "The total will appear when all sections are scored"}
            </SettingsHint>
          )}
        </Group>
      )}
    </Stack>
  );
}
