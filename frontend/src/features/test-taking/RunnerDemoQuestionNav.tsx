import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import type { AnswerData } from "@/entities/question/types";
import type { ExamDisplayType, QuestionNumberFormat } from "@/entities/test/types";
import { formatQuestionRange } from "@/features/question-types/numbering";
import { SettingsHint } from "@/shared/ui/SettingsHint";
import type { ToeflPage } from "./layouts/toefl/toeflPages";
import { navUnits } from "./navUnits";
import type { RunnerPage } from "./runnerPages";
import { buildNavSections, type NavGroup } from "./runnerNavGroups";

type RunnerDemoQuestionNavProps = {
  pages: RunnerPage[];
  current: RunnerPage | undefined;
  answers: Record<string, AnswerData>;
  examType: ExamDisplayType;
  numberFormat: QuestionNumberFormat;
  focusSlot: number | null;
  canGoTo: (pageIndex: number) => boolean;
  onGoToPage: (page: RunnerPage) => void;
  onGoToSlot: (slot: number, within: RunnerPage[]) => void;
};

function sectionEntryPage(sectionPages: RunnerPage[], sectionId: string, useScopeIntros: boolean): RunnerPage | undefined {
  if (useScopeIntros) {
    const intro = sectionPages.find(
      (page) => page.section.id === sectionId && (page as ToeflPage).intro === "section",
    );
    if (intro) {
      return intro;
    }
  }
  return sectionPages.find((page) => !(page as ToeflPage).intro) ?? sectionPages[0];
}

function partEntryPage(group: NavGroup, useScopeIntros: boolean): RunnerPage | undefined {
  if (useScopeIntros) {
    const intro = group.pages.find((page) => (page as ToeflPage).intro === "part");
    if (intro) {
      return intro;
    }
  }
  return group.pages.find((page) => !(page as ToeflPage).intro) ?? group.pages[0];
}

export function RunnerDemoQuestionNav({
  pages,
  current,
  answers,
  examType,
  numberFormat,
  focusSlot,
  canGoTo,
  onGoToPage,
  onGoToSlot,
}: RunnerDemoQuestionNavProps) {
  const navSections = buildNavSections(pages);
  const useScopeIntros = examType === "TOEIC";

  const openPart = (group: NavGroup) => {
    const page = partEntryPage(group, useScopeIntros);
    if (page) {
      onGoToPage(page);
    }
  };

  return (
    <Box
      component="nav"
      aria-label="Questions"
      className="runner-toefl-demo-nav"
      style={{
        width: "100%",
        minHeight: 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        background: "var(--mantine-color-body)",
        boxShadow: "var(--shadow-soft)",
        borderRadius: "var(--mantine-radius-default)",
        padding: "var(--block-pad-y) var(--block-pad-x)",
      }}
    >
      <Stack gap="sm">
        <SettingsHint>
          Отображается только в демо-просмотре для перехода
        </SettingsHint>
        {navSections.map((section) => {
          const sectionPages = section.parts.flatMap((group) => group.pages);
          const sectionActive = Boolean(
            current
            && current.section.id === section.sectionId
            && (current as ToeflPage).intro === "section",
          );
          const openSection = () => {
            const page = sectionEntryPage(sectionPages, section.sectionId, useScopeIntros);
            if (page) {
              onGoToPage(page);
            }
          };
          return (
            <Stack key={section.key} gap={6}>
              <UnstyledButton
                className="runner-toefl-demo-nav-title"
                onClick={openSection}
                aria-current={sectionActive ? "true" : undefined}
              >
                <Text
                  size="md"
                  fw={700}
                  ta="left"
                  c={sectionActive ? "iba" : undefined}
                  style={{ lineHeight: "var(--mantine-line-height-md)" }}
                >
                  {section.title}
                </Text>
              </UnstyledButton>
              {section.parts.map((group) => {
                const active = Boolean(
                  current
                  && group.partId
                  && current.part?.id === group.partId
                  && (current as ToeflPage).intro === "part",
                );
                const showPartTitle = group.partId != null;
                return (
                  <Stack key={group.key} gap={2} pl={showPartTitle ? "md" : 0}>
                    {showPartTitle ? (
                      <UnstyledButton
                        className="runner-toefl-demo-nav-title"
                        onClick={() => openPart(group)}
                        aria-current={active ? "true" : undefined}
                      >
                        <Text
                          size="sm"
                          fw={active ? 700 : 600}
                          ta="left"
                          c={active ? "iba" : undefined}
                          style={{ lineHeight: "var(--mantine-line-height-sm)" }}
                        >
                          {group.label}
                        </Text>
                      </UnstyledButton>
                    ) : null}
                    <Group
                      gap={2}
                      component="ol"
                      wrap="wrap"
                      style={{ listStyle: "none", margin: 0, padding: 0 }}
                    >
                      {group.pages.flatMap((page) => {
                        if ((page as ToeflPage).intro) {
                          return [];
                        }
                        const pageIndex = pages.indexOf(page);
                        const allowed = canGoTo(pageIndex);
                        return navUnits(page, answers, examType).map((unit) => {
                          const answered = unit.answered === unit.total;
                          const focused = page.key === current?.key
                            && focusSlot !== null
                            && focusSlot >= unit.start
                            && focusSlot <= unit.end;
                          const label = formatQuestionRange(unit.start, unit.total, numberFormat);
                          return (
                            <Box component="li" key={unit.key}>
                              <UnstyledButton
                                className="runner-toefl-demo-nav-unit"
                                aria-current={focused ? "step" : undefined}
                                aria-disabled={!allowed}
                                disabled={!allowed}
                                aria-label={`${label}${answered ? ", answered" : unit.answered > 0 ? `, ${unit.answered} of ${unit.total} answered` : ", not answered"}${allowed ? "" : ", unavailable"}`}
                                onClick={() => onGoToSlot(unit.start, group.pages)}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 3,
                                  minWidth: 22,
                                  height: 32,
                                  paddingInline: 3,
                                  opacity: allowed ? 1 : 0.4,
                                  cursor: allowed ? "pointer" : "not-allowed",
                                }}
                              >
                                <Text
                                  span
                                  size="sm"
                                  fw={focused || answered ? 700 : 500}
                                  c={focused ? "iba" : answered ? "dark" : "dimmed"}
                                  style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap" }}
                                >
                                  {label}
                                </Text>
                                <Box
                                  aria-hidden
                                  className="runner-toefl-demo-nav-unit-mark"
                                  style={{
                                    width: unit.total > 1 ? "100%" : 12,
                                    height: 2,
                                    borderRadius: 1,
                                    background: answered || focused
                                      ? "var(--color-primary)"
                                      : "color-mix(in srgb, var(--color-dark) 22%, transparent)",
                                  }}
                                />
                              </UnstyledButton>
                            </Box>
                          );
                        });
                      })}
                    </Group>
                  </Stack>
                );
              })}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}