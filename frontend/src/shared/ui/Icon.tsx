const PATHS = {
  back: "M10 3.5 5.5 8 10 12.5",
  chevron: "M6 3.5 10.5 8 6 12.5",
  down: "M3.5 6 8 10.5 12.5 6",
  arrowRight: "M3 8h10M9 4l4 4-4 4",
  up: "M3.5 10 8 5.5 12.5 10",
  plus: "M8 3v10M3 8h10",
  close: "M4 4l8 8M12 4l-8 8",
  check: "M3.5 8.2 6.4 11.1 12.5 4.9",
  trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5",
  copy: "M5.5 5.5h7v7h-7zM3.5 10.5v-7h7",
  link: "M7 9a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 9 3.5l-.5.5M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.5-.5",
  image: "M2.5 3.5h11v9h-11zM2.5 10.2 5.2 7.5l2 2 1.6-1.6L12.5 11M6 6.2h.01",
  table: "M2.5 3.5h11v9h-11zM2.5 6.5h11M2.5 9.5h11M7 3.5v9",
  erase: "M9.2 2.8 13.2 6.8 7.2 12.8H3.2V8.8zM2.5 13.5h5.5",
  upload: "M8 11V3M5 6l3-3 3 3M3 11v2h10v-2",
  download: "M8 3v8M5 8l3 3 3-3M3 11v2h10v-2",
  play: "M5 3.5v9l7-4.5z",
  pause: "M5.5 3.5v9M10.5 3.5v9",
  stop: "M4.5 4.5h7v7h-7z",
  mic: "M8 2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-4 0v-3a2 2 0 0 1 2-2zM4.5 7.5a3.5 3.5 0 0 0 7 0M8 11v2.5",
  panel: "M2.5 3.5h11v9h-11zM10 3.5v9",
  warning: "M8 2.5 14 13H2zM8 6.5v3M8 11.2v.3",
  clock: "M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 5v3l2 1.5",
  refresh: "M13.2 6.2A5.2 5.2 0 1 0 12.6 11M13.2 2.8v3.6H9.6",
  file: "M4 2.5h5l3 3v8H4zM9 2.5v3h3",
  folder: "M2.5 4.5h3.2l1.3 1.5H13.5v7H2.5z",
  search: "M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.3 10.3 13.5 13.5",
  filter: "M2.5 3.5h11L9.5 8.8V13l-3-1.2V8.8L2.5 3.5z",
  grip: "M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01",
  eye: "M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  menu: "M2.5 4h11M2.5 8h11M2.5 12h11",
  settings: "M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 2v1.2M8 12.8V14M14 8h-1.2M3.2 8H2M12.2 3.8l-.85.85M4.65 11.35l-.85.85M12.2 12.2l-.85-.85M4.65 4.65l-.85-.85",
  home: "M2.5 7.5 8 2.5l5.5 5M4 6.5v6.5h3V10h2v3h3V6.5",
  tests: "M4 2.5h6.5L13 5v8.5H4zM10.5 2.5V5H13M6 8h4M6 10.5h4",
  chart: "M3 12.5V8.5M6.5 12.5V5.5M10 12.5V7M13 12.5V3.5M2.5 12.5h11",
  user: "M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4",
  users: "M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10.5 7.2a1.7 1.7 0 1 0 0-3.2M2.5 13c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5M10 9.5c1.5 0 3 1.2 3 3",
  history: "M8 2.5a5.5 5.5 0 1 0 5.2 3.8M13.2 2.8v3.6H9.6M8 5v3.2l2.2 1.3",
  logout: "M6 3H3.5v10H6M8 8h5.5M11 5.5 13.5 8 11 10.5",
  mail: "M2.5 4.5h11v7h-11zM2.5 4.5 8 9l5.5-4.5",
  bell: "M8 1.8a3.2 3.2 0 0 0-3.2 3.2v1.4c0 .9-.3 1.7-.8 2.4L3.2 10.5h9.6l-.8-1.7a4 4 0 0 1-.8-2.4V5A3.2 3.2 0 0 0 8 1.8zM6.2 12.2a1.8 1.8 0 0 0 3.6 0",
  lock: "M5 7V5.5a3 3 0 0 1 6 0V7M4 7h8v6.5H4z",
  blankGap: "M3 11.5h10M5 8h.01M8 8h.01M11 8h.01",
  blankTail: "M3 11.5h4M8.5 11.5h4.5M3.5 5.5h3.5v6",
  blankDropdown: "M2.5 4.5h11v7h-11zM5.5 8l2.5 2.5L10.5 8",
  blankMarker: "M4 12.5 8 3.5l4 9M5.5 9.5h5",
  blankLine: "M2 9.5h2M5.5 9.5h2M9 9.5h2M12.5 9.5h1.5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} stroke="currentColor" strokeWidth={name === "grip" ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
