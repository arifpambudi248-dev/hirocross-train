import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Activity, 
  BarChart3, 
  Calendar, 
  ChevronRight, 
  Dumbbell, 
  Heart, 
  LineChart, 
  Shield, 
  Star, 
  Target, 
  TrendingUp, 
  Users, 
  Zap 
} from "lucide-react";
import { Link } from "react-router-dom";
import dashboardPreview from "@/assets/dashboard-preview.png";
import trainingPreview from "@/assets/training-preview.png";
import analyticsPreview from "@/assets/analytics-preview.png";
import logo from "@/assets/hirocross-logo.png";

const features = [
  {
    icon: Calendar,
    title: "Periodisasi Latihan",
    description: "Rencanakan program latihan tahunan dengan fase persiapan, kompetisi, dan pemulihan yang terstruktur."
  },
  {
    icon: Activity,
    title: "Monitoring Beban Latihan",
    description: "Pantau training load harian dan mingguan dengan perhitungan ACWR otomatis untuk mencegah overtraining."
  },
  {
    icon: Heart,
    title: "Readiness Score",
    description: "Ukur kesiapan atlet dengan parameter HR istirahat dan vertical jump untuk optimasi performa."
  },
  {
    icon: BarChart3,
    title: "Analisis Performa",
    description: "Visualisasi data komprehensif dengan grafik tren, laporan mingguan, dan analisis prediktif."
  },
  {
    icon: Users,
    title: "Manajemen Tim",
    description: "Kelola multiple atlet dengan dashboard pelatih yang powerful untuk monitoring tim."
  },
  {
    icon: Shield,
    title: "Pencegahan Cedera",
    description: "Sistem deteksi dini risiko cedera berdasarkan load monitoring dan readiness data."
  }
];

const stats = [
  { value: "98%", label: "Akurasi Prediksi" },
  { value: "500+", label: "Atlet Aktif" },
  { value: "24/7", label: "Monitoring" },
  { value: "50+", label: "Pelatih Profesional" }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="HiroCross" className="h-10 w-auto" />
            <span className="font-display text-xl font-bold text-foreground">HiroCross</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Masuk
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90 animate-glow-pulse">
                Mulai Gratis
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 hero-gradient">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">Platform #1 untuk Periodisasi Latihan</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-display font-bold leading-tight">
                <span className="text-foreground">Optimalkan</span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
                  Performa Atlet
                </span>
                <br />
                <span className="text-foreground">Anda</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Sistem periodisasi latihan berbasis data untuk atlet dan pelatih profesional. 
                Monitoring beban latihan, readiness, dan analisis performa dalam satu platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-primary hover:bg-primary/90 glow-effect">
                    Mulai Sekarang
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 border-border/50 hover:bg-secondary">
                  <Target className="w-5 h-5 mr-2" />
                  Lihat Demo
                </Button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-border/30">
                {stats.map((stat, idx) => (
                  <div key={idx} className="text-center sm:text-left">
                    <div className="text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right content - Dashboard Preview */}
            <div className="relative animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <div className="relative">
                {/* Glow effect behind image */}
                <div className="absolute -inset-4 bg-primary/20 rounded-2xl blur-2xl" />
                
                {/* Main dashboard image */}
                <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl animate-float">
                  <img 
                    src={dashboardPreview} 
                    alt="Dashboard Preview" 
                    className="w-full h-auto"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
                </div>
                
                {/* Floating card 1 */}
                <div className="absolute -left-8 bottom-1/4 glass-card rounded-xl p-4 shadow-xl animate-float" style={{ animationDelay: "1s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">Readiness</div>
                      <div className="text-2xl font-bold text-success">92%</div>
                    </div>
                  </div>
                </div>
                
                {/* Floating card 2 */}
                <div className="absolute -right-4 top-1/4 glass-card rounded-xl p-4 shadow-xl animate-float" style={{ animationDelay: "2s" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">Weekly Load</div>
                      <div className="text-2xl font-bold text-primary">2,450 AU</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Fitur <span className="text-primary">Lengkap</span> untuk Kesuksesan
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Semua yang Anda butuhkan untuk merencanakan, memonitor, dan menganalisis program latihan atlet
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className="group glass-card hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Tampilan <span className="text-primary">Premium</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Interface yang intuitif dan profesional untuk pengalaman terbaik
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            {/* Left - Training Preview */}
            <div className="relative animate-slide-in-right" style={{ animationDelay: "0.2s" }}>
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-xl mx-auto max-w-[300px]">
                <img 
                  src={trainingPreview} 
                  alt="Training Program" 
                  className="w-full h-auto"
                />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-foreground">Program Latihan</h3>
                <p className="text-sm text-muted-foreground">Buat dan kelola program latihan harian</p>
              </div>
            </div>
            
            {/* Center - Analytics Preview (larger) */}
            <div className="relative animate-fade-in-up lg:scale-110">
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 rounded-2xl blur-xl" />
                <div className="relative rounded-2xl overflow-hidden border border-primary/30 shadow-2xl">
                  <img 
                    src={analyticsPreview} 
                    alt="Analytics Dashboard" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
              <div className="mt-6 text-center">
                <h3 className="text-lg font-semibold text-foreground">Analisis Performa</h3>
                <p className="text-sm text-muted-foreground">Visualisasi data komprehensif</p>
              </div>
            </div>
            
            {/* Right - Dashboard small */}
            <div className="relative animate-slide-in-right" style={{ animationDelay: "0.4s" }}>
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-xl">
                <img 
                  src={dashboardPreview} 
                  alt="Dashboard" 
                  className="w-full h-auto"
                />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-foreground">Dashboard Lengkap</h3>
                <p className="text-sm text-muted-foreground">Semua data dalam satu tampilan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial/Trust Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 hero-gradient opacity-50" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-warning fill-warning" />
              ))}
            </div>
            
            <blockquote className="text-2xl lg:text-3xl font-display text-foreground mb-8 leading-relaxed">
              "Platform ini mengubah cara kami merencanakan dan memonitor latihan atlet. 
              Data yang akurat dan visualisasi yang jelas sangat membantu pengambilan keputusan."
            </blockquote>
            
            <div className="flex items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Pelatih Profesional</div>
                <div className="text-muted-foreground">Tim Nasional Indonesia</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <Card className="relative overflow-hidden glass-card border-primary/30">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]" />
            
            <CardContent className="relative z-10 p-12 lg:p-16 text-center">
              <h2 className="text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
                Siap Meningkatkan <span className="text-primary">Performa</span>?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Bergabung dengan ratusan pelatih dan atlet yang sudah menggunakan platform kami 
                untuk mencapai performa terbaik mereka.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="text-lg px-10 py-6 bg-primary hover:bg-primary/90 glow-effect">
                    Mulai Gratis Sekarang
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="HiroCross" className="h-8 w-auto" />
              <span className="font-display font-bold text-foreground">HiroCross</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 HiroCross. Platform Periodisasi Latihan Atletik.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Kebijakan Privasi
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Syarat & Ketentuan
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
