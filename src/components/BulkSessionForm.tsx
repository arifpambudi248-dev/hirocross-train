import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ChevronRight, ChevronLeft, Calendar } from "lucide-react";
import { TrainingSessionForm, SessionFormData } from "@/components/TrainingSessionForm";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type Athlete = {
  id: string;
  athlete_name: string;
};

interface BulkSessionFormProps {
  athletes: Athlete[];
  onSubmit: (data: SessionFormData, selectedAthleteIds: string[], selectedDate: string) => void;
  onCancel: () => void;
}

export function BulkSessionForm({ athletes, onSubmit, onCancel }: BulkSessionFormProps) {
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAthletes = athletes.filter(a => 
    a.athlete_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAthleteToggle = (athleteId: string) => {
    setSelectedAthleteIds(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAthleteIds.length === filteredAthletes.length) {
      setSelectedAthleteIds([]);
    } else {
      setSelectedAthleteIds(filteredAthletes.map(a => a.id));
    }
  };

  const handleFormSubmit = (formData: SessionFormData) => {
    onSubmit(formData, selectedAthleteIds, selectedDate);
  };

  const handleNext = () => {
    if (selectedAthleteIds.length === 0) return;
    setStep("form");
  };

  const handleBack = () => {
    setStep("select");
  };

  if (step === "form") {
    return (
      <div className="space-y-4">
        {/* Header showing selected athletes */}
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/30">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">
            {selectedAthleteIds.length} atlet dipilih
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="ml-auto text-xs h-7"
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            Ubah Pilihan
          </Button>
        </div>
        
        <TrainingSessionForm
          selectedDate={selectedDate}
          onSubmit={handleFormSubmit}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Tanggal Sesi
        </Label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-background border-border"
        />
        <p className="text-xs text-muted-foreground">
          {format(new Date(selectedDate), "EEEE, d MMMM yyyy", { locale: localeId })}
        </p>
      </div>

      {/* Athlete Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pilih Atlet
          </Label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSelectAll}
            className="text-xs h-7"
          >
            {selectedAthleteIds.length === filteredAthletes.length ? "Batal Semua" : "Pilih Semua"}
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Cari atlet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-background border-border"
        />

        {/* Athletes List */}
        <ScrollArea className="h-[300px] rounded-lg border border-border">
          <div className="p-2 space-y-1">
            {filteredAthletes.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                Tidak ada atlet ditemukan
              </div>
            ) : (
              filteredAthletes.map((athlete) => (
                <div
                  key={athlete.id}
                  onClick={() => handleAthleteToggle(athlete.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedAthleteIds.includes(athlete.id)
                      ? "bg-primary/20 border border-primary/50"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <Checkbox
                    checked={selectedAthleteIds.includes(athlete.id)}
                    onCheckedChange={() => handleAthleteToggle(athlete.id)}
                    className="pointer-events-none"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{athlete.athlete_name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Selected count */}
        {selectedAthleteIds.length > 0 && (
          <div className="text-sm text-primary">
            {selectedAthleteIds.length} atlet akan mendapatkan program yang sama
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Batal
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={selectedAthleteIds.length === 0}
          className="flex-1"
        >
          Lanjut
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
