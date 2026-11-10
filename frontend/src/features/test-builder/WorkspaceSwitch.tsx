import { SegmentedControl } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import type { BuilderWorkspace } from "./BuilderBar";

type WorkspaceSwitchProps = {
  testId: string;
  workspace: BuilderWorkspace;
};

export function WorkspaceSwitch({ testId, workspace }: WorkspaceSwitchProps) {
  const navigate = useNavigate();
  return (
    <SegmentedControl
      fullWidth
      withItemsBorders={false}
      value={workspace}
      onChange={(value) => {
        const next = value as BuilderWorkspace;
        navigate(next === "settings" ? `/teacher/tests/${testId}/settings` : `/teacher/tests/${testId}`);
      }}
      data={[
        { label: "Конструктор", value: "builder" },
        { label: "Настройки", value: "settings" },
      ]}
      className="iba-sidebar-sc"
      classNames={{ label: "iba-sidebar-sc-label" }}
      vars={() => ({
        root: {
          "--sc-color": "var(--mantine-color-white)",
          "--sc-shadow": "none",
        },
      })}
      styles={{
        root: {
          backgroundColor: "color-mix(in srgb, var(--mantine-color-white) 16%, transparent)",
        },
      }}
    />
  );
}
