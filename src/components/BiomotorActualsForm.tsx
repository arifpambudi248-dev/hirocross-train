import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type BiomotorActual = {
  id?: string;
  plan_id: string;
  week_number: number;
  kekuatan: number;
  kecepatan: number;
  daya_tahan: number;
  teknik: number;
  taktik: number;
  notes?: string;
};

type PlannedBiomotor = {
  week_number: number;
  kekuatan: number;
  kecepatan: number;
  daya_tahan: number;
  teknik: number;
  taktik: number;
};

interface BiomotorActualsFormProps {
  planId: string;
  totalWeeks: number;
  plannedData: PlannedBiomotor[];
  isCoach: boolean;
  onDataChange?: () => void;
}

export function BiomotorActualsForm({
  planId,
  totalWeeks,
  plannedData,
  isCoach,
  onDataChange,
}: BiomotorActualsFormProps) {
  const [actuals, setActuals] = useState<BiomotorActual[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (planId) {
      loadActuals();
    }
  }, [planId]);

  const loadActuals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("weekly_biomotor_actuals")
        .select("*")
        .eq("plan_id", planId)
        .order("week_number", { ascending: true });

      if (error) throw error;

      // Initialize with empty data for all weeks
      const initialData: BiomotorActual[] = [];
      for (let i = 1; i <= totalWeeks; i++) {
        const existing = data?.find((d) => d.week_number === i);
        initialData.push({
          id: existing?.id,
          plan_id: planId,
          week_number: i,
          kekuatan: existing?.kekuatan || 0,
          kecepatan: existing?.kecepatan || 0,
          daya_tahan: existing?.daya_tahan || 0,
          teknik: existing?.teknik || 0,
          taktik: existing?.taktik || 0,
          notes: existing?.notes || "",
        });
      }
      setActuals(initialData);
    } catch (error: any) {
      toast.error("Gagal memuat data aktual: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (weekNumber: number, field: keyof BiomotorActual, value: number | string) => {
    setActuals((prev) =>
      prev.map((a) =>
        a.week_number === weekNumber ? { ...a, [field]: value } : a
      )
    );
  };

  const saveActuals = async () => {
    setIsLoading(true);
    try {
      for (const actual of actuals) {
        if (actual.id) {
          await supabase
            .from("weekly_biomotor_actuals")
            .update({
              kekuatan: actual.kekuatan,
              kecepatan: actual.kecepatan,
              daya_tahan: actual.daya_tahan,
              teknik: actual.teknik,
              taktik: actual.taktik,
              notes: actual.notes,
            })
            .eq("id", actual.id);
        } else {
          const { data } = await supabase
            .from("weekly_biomotor_actuals")
            .insert({
              plan_id: planId,
              week_number: actual.week_number,
              kekuatan: actual.kekuatan,
              kecepatan: actual.kecepatan,
              daya_tahan: actual.daya_tahan,
              teknik: actual.teknik,
              taktik: actual.taktik,
              notes: actual.notes,
            })
            .select()
            .single();

          if (data) {
            setActuals((prev) =>
              prev.map((a) =>
                a.week_number === actual.week_number ? { ...a, id: data.id } : a
              )
            );
          }
        }
      }

      setIsEditing(false);
      toast.success("Data aktual biomotor berhasil disimpan");
      onDataChange?.();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompletionPercentage = (weekNumber: number, field: keyof Omit<BiomotorActual, 'id' | 'plan_id' | 'week_number' | 'notes'>) => {
    const planned = plannedData.find(p => p.week_number === weekNumber);
    const actual = actuals.find(a => a.week_number === weekNumber);
    if (!planned || !actual || planned[field] === 0) return 0;
    return Math.round((Number(actual[field]) / planned[field]) * 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 dark:text-green-400";
    if (percentage >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const biomotorFields = [
    { key: "kekuatan" as const, label: "Kekuatan", color: "bg-red-100 dark:bg-red-900", textColor: "text-red-700 dark:text-red-300" },
    { key: "kecepatan" as const, label: "Kecepatan", color: "bg-yellow-100 dark:bg-yellow-900", textColor: "text-yellow-700 dark:text-yellow-300" },
    { key: "daya_tahan" as const, label: "D.Tahan", color: "bg-blue-100 dark:bg-blue-900", textColor: "text-blue-700 dark:text-blue-300" },
    { key: "teknik" as const, label: "Teknik", color: "bg-green-100 dark:bg-green-900", textColor: "text-green-700 dark:text-green-300" },
    { key: "taktik" as const, label: "Taktik", color: "bg-purple-100 dark:bg-purple-900", textColor: "text-purple-700 dark:text-purple-300" },
  ];

  if (isLoading && actuals.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">Memuat data...</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-0 hover:bg-transparent">
              <CardTitle className="text-base">Input Data Aktual Biomotor</CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          {isCoach && (
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  saveActuals();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isLoading}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Aktual
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border bg-muted text-left sticky left-0 z-10 min-w-[100px]">Komponen</th>
                    {Array.from({ length: totalWeeks }, (_, i) => (
                      <th key={i} className="p-2 border bg-muted text-center min-w-[70px]">
                        M{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {biomotorFields.map((field) => (
                    <tr key={field.key}>
                      <td className={`p-2 border font-medium sticky left-0 z-10 ${field.color} ${field.textColor}`}>
                        {field.label}
                      </td>
                      {actuals.map((actual) => {
                        const planned = plannedData.find(p => p.week_number === actual.week_number);
                        const percentage = getCompletionPercentage(actual.week_number, field.key);
                        
                        return (
                          <td key={actual.week_number} className="p-1 border text-center">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                value={actual[field.key]}
                                onChange={(e) => handleValueChange(actual.week_number, field.key, Number(e.target.value))}
                                className="w-full h-7 text-xs text-center"
                              />
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="font-medium">{Number(actual[field.key]).toLocaleString()}</span>
                                {planned && Number(actual[field.key]) > 0 && (
                                  <span className={`text-[10px] ${getStatusColor(percentage)}`}>
                                    ({percentage}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Persentase menunjukkan pencapaian aktual vs target planned. Hijau ≥90%, Kuning ≥70%, Merah &lt;70%
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
