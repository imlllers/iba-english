import type { RunnerPage } from "./runnerPages";

export type NavGroup = {
  key: string;
  label: string;
  sectionId: string;
  partId: string | null;
  pages: RunnerPage[];
};

export type NavSection = {
  key: string;
  sectionId: string;
  title: string;
  parts: NavGroup[];
};

export function buildNavGroups(pages: RunnerPage[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const page of pages) {
    const key = page.part?.id ? `part:${page.part.id}` : `section:${page.section.id}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.pages.push(page);
      continue;
    }
    groups.push({
      key,
      label: page.part?.title || page.section.title,
      sectionId: page.section.id,
      partId: page.part?.id ?? null,
      pages: [page],
    });
  }
  return groups;
}

export function buildNavSections(pages: RunnerPage[]): NavSection[] {
  const groups = buildNavGroups(pages);
  const sections: NavSection[] = [];
  for (const group of groups) {
    const last = sections[sections.length - 1];
    if (last?.sectionId === group.sectionId) {
      last.parts.push(group);
      continue;
    }
    const sectionTitle = group.pages[0]?.section.title?.trim() || group.label;
    sections.push({
      key: `section:${group.sectionId}`,
      sectionId: group.sectionId,
      title: sectionTitle,
      parts: [group],
    });
  }
  return sections;
}