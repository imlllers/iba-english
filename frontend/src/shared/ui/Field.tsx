import { Input } from "@mantine/core";
import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  withAsterisk?: boolean;
  children: ReactNode;
};

export function Field({ label, hint, error, withAsterisk, children }: FieldProps) {
  return (
    <Input.Wrapper label={label} description={hint} error={error} withAsterisk={withAsterisk}>
      {children}
    </Input.Wrapper>
  );
}
