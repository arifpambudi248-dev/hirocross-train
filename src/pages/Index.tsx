import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Activity, Target } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Sistem Periodisasi Latihan Atletik
          </h1>
          <p className="text-muted-foreground text-lg">
            Platform komprehensif untuk monitoring dan analisis performa atlet
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">Annual Plan</CardTitle>
                <p className="text-sm text-muted-foreground">GPP-SPP-Pra-Komp</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Periodisasi tahunan dengan grafik load</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">Analisis Load</CardTitle>
                <p className="text-sm text-muted-foreground">FFF & ACWR</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Fitness, Fatigue, Form, dan ACWR monitoring</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">Readiness</CardTitle>
                <p className="text-sm text-muted-foreground">VJ + RHR</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Monitoring kesiapan atlet harian</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-lg">Tes Fisik</CardTitle>
                <p className="text-sm text-muted-foreground">6 Kategori</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Tracking tes kondisi fisik atlet</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fitur Utama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">Training Load Otomatis</h3>
                <p className="text-sm text-muted-foreground">
                  Perhitungan load otomatis dari RPE × durasi dengan opsi edit manual
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">Grafik FFF</h3>
                <p className="text-sm text-muted-foreground">
                  Visualisasi Fitness (CTL), Fatigue (ATL), dan Form (TSB)
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">ACWR Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Deteksi dini risiko overtraining dengan Acute:Chronic Workload Ratio
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-primary">Readiness Scoring</h3>
                <p className="text-sm text-muted-foreground">
                  Skor 0-100 dari Vertical Jump dan Resting Heart Rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
