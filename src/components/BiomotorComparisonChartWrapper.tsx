import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BiomotorComparisonChart } from "@/components/BiomotorComparisonChart";

type BiomotorData = {
  week_number: number;
  kekuatan: number;
  kecepatan: number;
  daya_tahan: number;
  teknik: number;
  taktik: number;
};

interface BiomotorComparisonChartWrapperProps {
  planId: string;
  plannedData: BiomotorData[];
  refreshKey?: number;
}

export function BiomotorComparisonChartWrapper({
  planId,
  plannedData,
  refreshKey = 0,
}: BiomotorComparisonChartWrapperProps) {
  const [actualData, setActualData] = useState<BiomotorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActualData();
  }, [planId, refreshKey]);

  const loadActualData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("weekly_biomotor_actuals")
        .select("*")
        .eq("plan_id", planId)
        .order("week_number", { ascending: true });

      if (error) throw error;

      const formattedData: BiomotorData[] = (data || []).map((d) => ({
        week_number: d.week_number,
        kekuatan: Number(d.kekuatan) || 0,
        kecepatan: Number(d.kecepatan) || 0,
        daya_tahan: Number(d.daya_tahan) || 0,
        teknik: Number(d.teknik) || 0,
        taktik: Number(d.taktik) || 0,
      }));

      // Fill in missing weeks with zeros
      const filledData: BiomotorData[] = plannedData.map((p) => {
        const actual = formattedData.find((a) => a.week_number === p.week_number);
        return actual || {
          week_number: p.week_number,
          kekuatan: 0,
          kecepatan: 0,
          daya_tahan: 0,
          teknik: 0,
          taktik: 0,
        };
      });

      setActualData(filledData);
    } catch (error) {
      console.error("Error loading biomotor actuals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if there's any actual data entered
  const hasActualData = actualData.some(
    (d) => d.kekuatan > 0 || d.kecepatan > 0 || d.daya_tahan > 0 || d.teknik > 0 || d.taktik > 0
  );

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Memuat data perbandingan...
      </div>
    );
  }

  if (!hasActualData) {
    return (
      <div className="border rounded-lg p-6 text-center text-muted-foreground bg-muted/30">
        <p className="text-sm">
          Belum ada data aktual biomotor yang diisi. Isi data aktual di form di atas untuk melihat perbandingan.
        </p>
      </div>
    );
  }

  return (
    <BiomotorComparisonChart
      plannedData={plannedData}
      actualData={actualData}
    />
  );
}
