import { supabase } from "@/integrations/supabase/client";
import { getAgeGroup, type AgeGroup, type BenchmarkScale, type TestBenchmark, type Gender } from "@/lib/physicalTestBenchmarks";

export type CustomNormSimple = BenchmarkScale;
export type CustomNormAgeBased = Record<AgeGroup, BenchmarkScale>;
export type CustomNorms = CustomNormSimple | CustomNormAgeBased;

export interface CustomTestItem {
  id: string;
  user_id: string;
  test_name: string;
  category: string;
  unit: string;
  description: string | null;
  inverse: boolean;
  use_age_based: boolean;
  norms: CustomNorms;
  created_at?: string;
  updated_at?: string;
}

export const emptySimpleNorm = (): CustomNormSimple => ({
  scale5: 0, scale4: 0, scale3: 0, scale2: 0, scale1: 0,
});

export const emptyAgeBasedNorm = (): CustomNormAgeBased => ({
  youth: emptySimpleNorm(),
  junior: emptySimpleNorm(),
  senior: emptySimpleNorm(),
  master: emptySimpleNorm(),
});

export async function fetchCustomTestItems(): Promise<CustomTestItem[]> {
  const { data, error } = await (supabase as any)
    .from("custom_test_items")
    .select("*")
    .order("test_name");
  if (error) {
    console.error("fetchCustomTestItems", error);
    return [];
  }
  return (data || []) as CustomTestItem[];
}

export function getCustomBenchmarkScale(
  item: CustomTestItem,
  age: number,
): BenchmarkScale {
  if (item.use_age_based) {
    return (item.norms as CustomNormAgeBased)[getAgeGroup(age)] || emptySimpleNorm();
  }
  return item.norms as CustomNormSimple;
}

export function calculateCustomScore(value: number, item: CustomTestItem, age: number): number {
  const scale = getCustomBenchmarkScale(item, age);
  if (item.inverse) {
    if (value <= scale.scale5) return 5;
    if (value <= scale.scale4) return 4;
    if (value <= scale.scale3) return 3;
    if (value <= scale.scale2) return 2;
    return 1;
  }
  if (value >= scale.scale5) return 5;
  if (value >= scale.scale4) return 4;
  if (value >= scale.scale3) return 3;
  if (value >= scale.scale2) return 2;
  return 1;
}

/** Convert a CustomTestItem into a TestBenchmark-like object (unisex applied to both genders). */
export function customItemToBenchmark(item: CustomTestItem): TestBenchmark {
  const ageScales: Record<AgeGroup, BenchmarkScale> = item.use_age_based
    ? (item.norms as CustomNormAgeBased)
    : {
        youth: item.norms as CustomNormSimple,
        junior: item.norms as CustomNormSimple,
        senior: item.norms as CustomNormSimple,
        master: item.norms as CustomNormSimple,
      };
  return {
    testName: item.test_name,
    unit: item.unit,
    inverse: item.inverse,
    description: item.description || "Tes custom",
    norms: { male: ageScales, female: ageScales },
  };
}
