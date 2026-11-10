import { Combobox, TextInput, useCombobox } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HeaderSlotContext } from "@/app/layout/headerSlot";
import { scoreScalesApi } from "@/features/score-scales/scoreScale";
import { templatesApi } from "@/features/templates/templatesApi";
import { Icon } from "@/shared/ui/Icon";
import {
  SECTION_LABELS,
  SETTINGS_SEARCH_ITEMS,
  filterSettingsItems,
  type SettingsSearchItem,
} from "./settingsSearch";

type SettingsHeaderSearchProps = {
  teacher: boolean;
  onSelect: (item: SettingsSearchItem) => void;
};

export function SettingsHeaderSearch({ teacher, onSelect }: SettingsHeaderSearchProps) {
  const headerSlot = useContext(HeaderSlotContext);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const [query, setQuery] = useState("");

  const templates = useQuery({ queryKey: ["templates"], queryFn: templatesApi.list, enabled: teacher });
  const scales = useQuery({ queryKey: ["score-scales"], queryFn: scoreScalesApi.list, enabled: teacher });

  const items = useMemo<SettingsSearchItem[]>(() => {
    const base = SETTINGS_SEARCH_ITEMS.filter((item) => (teacher ? !item.adminOnly : !item.teacherOnly));
    if (!teacher) return base;
    return [
      ...base,
      ...(templates.data ?? []).map((template) => ({
        id: `template:${template.id}`,
        label: template.title,
        keywords: ["шаблон", template.family, ...template.sections.map((section) => section.title)],
        section: "template" as const,
        params: { id: template.id },
      })),
      ...(scales.data ?? []).map((scale) => ({
        id: `scale:${scale.id}`,
        label: scale.title,
        keywords: ["шкала", ...scale.sections.map((section) => section.name), ...scale.levels.map((level) => level.label)],
        section: "scale" as const,
        params: { id: scale.id },
      })),
    ];
  }, [teacher, templates.data, scales.data]);

  const matches = useMemo(() => filterSettingsItems(query, items), [query, items]);

  useEffect(() => {
    if (matches.length) combobox.selectFirstOption();
  }, [matches]);

  const pick = (item: SettingsSearchItem) => {
    onSelect(item);
    setQuery("");
    combobox.closeDropdown();
  };

  const field = (
    <Combobox
      store={combobox}
      onOptionSubmit={(value) => {
        const item = matches.find((entry) => entry.id === value);
        if (item) {
          pick(item);
        }
      }}
    >
      <Combobox.Target>
        <TextInput
          aria-label="Поиск по настройкам"
          placeholder="Поиск по настройкам"
          value={query}
          w="var(--grid-col-span-3-width)"
          leftSection={<Icon name="search" />}
          leftSectionPointerEvents="none"
          onChange={(event) => {
            const next = event.currentTarget.value;
            setQuery(next);
            if (next.trim()) {
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            } else {
              combobox.closeDropdown();
            }
          }}
          onClick={() => {
            if (query.trim()) {
              combobox.openDropdown();
            }
          }}
          onFocus={() => {
            if (query.trim()) {
              combobox.openDropdown();
            }
          }}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {query.trim() && matches.length === 0 ? (
            <Combobox.Empty>Ничего не найдено</Combobox.Empty>
          ) : (
            matches.map((item) => (
              <Combobox.Option value={item.id} key={item.id}>
                {item.label}
                {item.label !== SECTION_LABELS[item.section] ? (
                  <span style={{ color: "var(--mantine-color-dimmed)", marginLeft: 8, fontSize: "var(--mantine-font-size-sm)" }}>
                    {SECTION_LABELS[item.section]}
                  </span>
                ) : null}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );

  if (!headerSlot) {
    return null;
  }
  return createPortal(field, headerSlot);
}
