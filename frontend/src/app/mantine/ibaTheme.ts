import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from "@mantine/core";
import { PasswordVisibilityIcon } from "@/shared/ui/PasswordVisibilityIcon";

const iba: MantineColorsTuple = [
  "#eef3fb",
  "#dce4f1",
  "#b7c8e5",
  "#8fa9d6",
  "#6b8cc8",
  "#4d74bb",
  "#164aa1",
  "#13408c",
  "#103677",
  "#0c2b5c",
];

export const ibaCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { "--mantine-color-gray-0": "var(--color-page)" },
  dark: { "--mantine-color-gray-0": "var(--color-page)" },
});

export const ibaTheme = createTheme({
  primaryColor: "iba",
  colors: { iba },
  cursorType: "pointer",
  fontFamily: '"Montserrat", "Segoe UI", sans-serif',
  fontWeights: {
    regular: "500",
    medium: "600",
    bold: "700",
  },
  fontSizes: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "20px",
    xl: "24px",
  },
  lineHeights: {
    xs: "22px",
    sm: "24px",
    md: "26px",
    lg: "30px",
    xl: "36px",
  },
  spacing: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  headings: {
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "32px", lineHeight: "44px", fontWeight: "700" },
      h2: { fontSize: "24px", lineHeight: "36px", fontWeight: "700" },
      h3: { fontSize: "20px", lineHeight: "30px", fontWeight: "700" },
      h4: { fontSize: "20px", lineHeight: "30px", fontWeight: "600" },
      h5: { fontSize: "16px", lineHeight: "26px", fontWeight: "600" },
      h6: { fontSize: "14px", lineHeight: "24px", fontWeight: "600" },
    },
  },
  defaultRadius: "md",
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "16px",
    xl: "24px",
  },
  shadows: {
    xs: "var(--shadow-soft)",
    sm: "var(--shadow-soft)",
    md: "var(--shadow-soft)",
    lg: "var(--shadow-soft)",
    xl: "var(--shadow-soft)",
  },
  primaryShade: 6,
  components: {
    Button: {
      defaultProps: { radius: "md", size: "md" },
      styles: {
        root: {
          fontWeight: 600,
        },
      },
    },
    ActionIcon: {
      defaultProps: { radius: "md", variant: "subtle" },
    },
    Card: {
      defaultProps: { radius: "md", shadow: "sm", withBorder: false },
      styles: {
        root: {
          padding: "var(--block-pad-y) var(--block-pad-x)",
        },
      },
    },
    Paper: {
      defaultProps: { radius: "md", shadow: "none", withBorder: false },
      styles: {
        root: {
          padding: "var(--block-pad-y) var(--block-pad-x)",
        },
      },
    },
    AppShell: {
      defaultProps: { padding: "sm", withBorder: false },
      styles: {
        header: {
          zIndex: 100,
          overflow: "visible",
          boxShadow: "var(--shadow-chrome)",
        },
      },
    },
    SegmentedControl: {
      styles: {
        root: { backgroundColor: "var(--color-page)" },
      },
    },
    Modal: {
      defaultProps: {
        radius: "md",
        centered: true,
        overlayProps: { backgroundOpacity: 0.45, blur: 2 },
      },
      styles: {
        title: { fontWeight: 700, fontSize: "var(--mantine-font-size-md)", lineHeight: "var(--mantine-line-height-md)" },
        content: { boxShadow: "var(--mantine-shadow-md)", padding: 0 },
        header: { padding: "var(--block-pad-y) var(--block-pad-x)", minHeight: 0 },
        body: { padding: "0 var(--block-pad-x) var(--block-pad-y)" },
      },
    },
    InputLabel: {
      defaultProps: { size: "sm" },
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 600,
        },
      },
    },
    InputWrapper: {
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 600,
        },
        description: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 500,
        },
      },
    },
    TextInput: {
      defaultProps: { radius: "md", size: "md" },
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 600,
        },
        input: {
          "&:focus, &:focus-within": { outline: "none", boxShadow: "none" },
        },
      },
    },
    Textarea: {
      defaultProps: { radius: "md", size: "md", autosize: true, minRows: 1 },
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 600,
        },
        input: {
          "&:focus, &:focus-within": { outline: "none", boxShadow: "none" },
        },
      },
    },
    Select: {
      defaultProps: { radius: "md", size: "md" },
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 600,
        },
        input: {
          "&:focus, &:focus-within": { outline: "none", boxShadow: "none" },
        },
      },
    },
    NumberInput: {
      defaultProps: { radius: "md", size: "md" },
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 600,
        },
        input: {
          "&:focus, &:focus-within": { outline: "none", boxShadow: "none" },
        },
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "md",
        size: "md",
        visibilityToggleIcon: PasswordVisibilityIcon,
      },
      styles: {
        label: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 600,
        },
        input: {
          "&:focus, &:focus-within": { outline: "none", boxShadow: "none" },
        },
        visibilityToggle: {
          outline: "none",
          boxShadow: "none",
          "&:focus, &:focus-visible, &:focus:not(:focus-visible)": {
            outline: "none",
            boxShadow: "none",
          },
        },
      },
    },
    Switch: {
      styles: {
        root: { width: "fit-content", maxWidth: "100%", cursor: "pointer" },
        body: { alignItems: "center", cursor: "pointer" },
        track: { cursor: "pointer", flex: "none" },
        label: {
          fontSize: "var(--mantine-font-size-md)",
          lineHeight: "var(--mantine-line-height-md)",
          fontWeight: 600,
          cursor: "pointer",
        },
        description: {
          fontSize: "var(--mantine-font-size-sm)",
          lineHeight: "var(--mantine-line-height-sm)",
          fontWeight: 500,
          marginTop: 4,
        },
      },
    },
    Checkbox: {
      styles: {
        root: { width: "fit-content", cursor: "pointer" },
        body: { alignItems: "center", cursor: "pointer" },
        inner: { alignSelf: "center" },
        input: {
          cursor: "pointer",
          outline: "none",
          boxShadow: "none",
          "&:hover:not(:disabled):not(:checked):not([data-indeterminate])": {
            borderColor: "var(--mantine-color-iba-4)",
          },
          "&:hover:not(:disabled):checked, &:hover:not(:disabled)[data-indeterminate]": {
            backgroundColor: "var(--mantine-color-iba-7)",
            borderColor: "var(--mantine-color-iba-7)",
          },
          "&:focus, &:focus-visible": {
            outline: "none",
            boxShadow: "none",
            borderColor: "var(--mantine-color-iba-6)",
          },
        },
        label: {
          fontSize: "var(--mantine-font-size-md)",
          lineHeight: "var(--mantine-line-height-md)",
          fontWeight: 600,
          cursor: "pointer",
        },
      },
    },
    Radio: {
      styles: {
        root: { width: "fit-content", cursor: "pointer" },
        body: { alignItems: "center", cursor: "pointer" },
        inner: { alignSelf: "center" },
        radio: {
          cursor: "pointer",
          outline: "none",
          boxShadow: "none",
          "&:focus, &:focus-visible": {
            outline: "none",
            boxShadow: "none",
            borderColor: "var(--mantine-color-iba-6)",
          },
        },
        label: {
          fontSize: "var(--mantine-font-size-md)",
          lineHeight: "var(--mantine-line-height-md)",
          fontWeight: 500,
          cursor: "pointer",
        },
      },
    },
    Badge: {
      defaultProps: { radius: "sm" },
    },
    NavLink: {
      defaultProps: { variant: "light" },
      styles: {
        root: {
          borderRadius: "var(--mantine-radius-md)",
        },
      },
    },
    Table: {
      defaultProps: {
        striped: false,
        highlightOnHover: true,
        verticalSpacing: "sm",
        horizontalSpacing: "md",
        layout: "fixed",
      },
      styles: {
        table: {
          width: "100%",
        },
        th: {
          background: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        },
      },
    },
  },
});
