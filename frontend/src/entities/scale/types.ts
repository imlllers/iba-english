export type ConvertMethod = "table" | "linear" | "manual";
export type ConvertRow = { from: number; to: number; score: number };
export type SectionConvert = { method: ConvertMethod; rawMax?: number | null; table?: ConvertRow[] };
import type { ExamDisplayType, SectionType } from "@/entities/test/types";

export type ScaleSection = { name: string; sectionType?: SectionType; min: number; max: number; step: number; convert?: SectionConvert };
export type ScaleLevel = { label: string; min: number; max?: number };
export type RoundMode = "nearest" | "down" | "up";
export type Aggregate = "sum" | "average";

export type ScoreScale = {
  id: string;
  title: string;
  examType?: ExamDisplayType;
  sections: ScaleSection[];
  aggregate: Aggregate;
  round: { step: number | null; mode: RoundMode };
  levels: ScaleLevel[];
};
