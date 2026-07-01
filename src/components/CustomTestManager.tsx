import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Settings2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CATEGORIES, type AgeGroup, type BenchmarkScale } from "@/lib/physicalTestBenchmarks";
import {
  fetchCustomTestItems,
  emptySimpleNorm,
  emptyAgeBasedNorm,
  type CustomTestItem,
  type CustomNormAgeBased,
} from "@/lib/customTestItems";

const AGE_GROUPS: { key: AgeGroup; label: string }[] = [
  { key: "youth", label: "< 15 thn" },
  { key: "junior", label: "15-19 thn" },
  { key: "senior", label: "20-34 thn" },
  { key: "master", label: "≥ 35 thn" },
];

interface Props {
  onChanged?: () => void;
  prominent?: boolean;
  buttonClassName?: string;
  label?: string;
}

export function CustomTestManager({
  onChanged,
  prominent = false,
  buttonClassName = "",
  label = "Kelola Tes Custom",
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomTestItem[]>([]);
  const [editing, setEditing] = useState<Partial<CustomTestItem> | null>(null);

  const load = async () => {
    setItems(await fetchCustomTestItems());
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const startNew = () => {
    setEditing({
      test_name: "",
      category: "kekuatan",
      unit: "",
      description: "",
      inverse: false,
      use_age_based: false,
      norms: emptySimpleNorm(),
    });
  };

  const startEdit = (it: CustomTestItem) => setEditing({ ...it });

  const remove = async (id: string) => {
    if (!confirm("Hapus item tes ini?")) return;
    const { error } = await (supabase as any).from("custom_test_items").delete().eq("id", id);
    if (error) return toast.error("Gagal menghapus");
    toast.success("Item dihapus");
    await load();
    onChanged?.();
  };

  const save = async () => {
    if (!editing?.test_name || !editing?.category || !editing?.unit) {
      return toast.error("Nama, kategori, dan satuan wajib diisi");
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Sesi tidak valid");

    const payload: any = {
      user_id: user.id,
      test_name: editing.test_name,
      category: editing.category,
      unit: editing.unit,
      description: editing.description || null,
      inverse: !!editing.inverse,
      use_age_based: !!editing.use_age_based,
      norms: editing.norms,
    };

    let error;
    if (editing.id) {
      ({ error } = await (supabase as any)
        .from("custom_test_items")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("custom_test_items").insert(payload));
    }
    if (error) {
      console.error(error);
      return toast.error("Gagal menyimpan");
    }
    toast.success("Tersimpan");
    setEditing(null);
    await load();
    onChanged?.();
  };

  const toggleAgeBased = (v: boolean) => {
    if (!editing) return;
    setEditing({
      ...editing,
      use_age_based: v,
      norms: v ? emptyAgeBasedNorm() : emptySimpleNorm(),
    });
  };

  const setScaleField = (
    group: AgeGroup | "_",
    field: keyof BenchmarkScale,
    val: number,
  ) => {
    if (!editing) return;
    if (editing.use_age_based) {
      const norms = { ...(editing.norms as CustomNormAgeBased) };
      norms[group as AgeGroup] = { ...norms[group as AgeGroup], [field]: val };
      setEditing({ ...editing, norms });
    } else {
      const norms = { ...(editing.norms as BenchmarkScale), [field]: val };
      setEditing({ ...editing, norms });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={prominent ? "default" : "outline"} className={`gap-2 ${buttonClassName}`}>
          <Settings2 className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Item Tes Custom (Privat)</DialogTitle>
        </DialogHeader>

        {!editing && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Hanya akun Anda yang dapat melihat & memakai item tes ini.
              </p>
              <Button onClick={startNew} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Item Baru
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada item tes custom.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <Card key={it.id}>
                    <CardContent className="pt-4 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{it.test_name}</span>
                          <Badge variant="secondary">
                            {CATEGORIES.find((c) => c.value === it.category)?.label || it.category}
                          </Badge>
                          <Badge variant="outline">{it.unit}</Badge>
                          {it.use_age_based && <Badge variant="outline">Per usia</Badge>}
                          {it.inverse && <Badge variant="outline">Lebih kecil = lebih baik</Badge>}
                        </div>
                        {it.description && (
                          <p className="text-xs text-muted-foreground mt-1">{it.description}</p>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(it)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nama Tes</Label>
                <Input
                  value={editing.test_name || ""}
                  onChange={(e) => setEditing({ ...editing, test_name: e.target.value })}
                  placeholder="Contoh: Plank Hold"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={editing.category}
                  onValueChange={(v) => setEditing({ ...editing, category: v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input
                  value={editing.unit || ""}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  placeholder="detik, cm, kg, ..."
                />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi (opsional)</Label>
                <Input
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={!!editing.inverse}
                  onCheckedChange={(v) => setEditing({ ...editing, inverse: v })}
                />
                <span className="text-sm">Nilai lebih kecil = lebih baik</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={!!editing.use_age_based}
                  onCheckedChange={toggleAgeBased}
                />
                <span className="text-sm">Norma per kelompok usia</span>
              </label>
            </div>

            <div className="space-y-3">
              <Label>Norma (5=Excellent ... 1=Poor)</Label>
              {!editing.use_age_based ? (
                <NormRow
                  scale={editing.norms as BenchmarkScale}
                  onChange={(f, v) => setScaleField("_", f, v)}
                />
              ) : (
                <div className="space-y-3">
                  {AGE_GROUPS.map((g) => (
                    <div key={g.key} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{g.label}</div>
                      <NormRow
                        scale={(editing.norms as CustomNormAgeBased)[g.key]}
                        onChange={(f, v) => setScaleField(g.key, f, v)}
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {editing.inverse
                  ? "Karena 'lebih kecil = lebih baik', isi nilai menaik: 5 paling kecil, 1 paling besar."
                  : "Isi nilai menurun: 5 paling besar, 1 paling kecil."}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
              <Button onClick={save}>Simpan</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NormRow({
  scale,
  onChange,
}: {
  scale: BenchmarkScale;
  onChange: (field: keyof BenchmarkScale, value: number) => void;
}) {
  const fields: { key: keyof BenchmarkScale; label: string }[] = [
    { key: "scale5", label: "5" },
    { key: "scale4", label: "4" },
    { key: "scale3", label: "3" },
    { key: "scale2", label: "2" },
    { key: "scale1", label: "1" },
  ];
  return (
    <div className="grid grid-cols-5 gap-2">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">Skala {f.label}</Label>
          <Input
            type="number"
            step="0.01"
            value={scale?.[f.key] ?? 0}
            onChange={(e) => onChange(f.key, parseFloat(e.target.value) || 0)}
          />
        </div>
      ))}
    </div>
  );
}
