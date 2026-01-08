import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, CreditCard, TrendingUp, Clock, Check, X, 
  Activity, Calendar, UserCheck, AlertCircle, ArrowRight,
  BarChart3, Shield
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

interface UserStats {
  totalUsers: number;
  activeSubscriptions: number;
  pendingVerifications: number;
  expiringSoon: number;
  coaches: number;
  athletes: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

interface RecentSubscription {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  plan: { name: string; price: number } | null;
  profile: { athlete_name: string } | null;
}

interface UserGrowthData {
  date: string;
  users: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    pendingVerifications: 0,
    expiringSoon: 0,
    coaches: 0,
    athletes: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });
  const [recentSubscriptions, setRecentSubscriptions] = useState<RecentSubscription[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([]);
  const [subscriptionsByStatus, setSubscriptionsByStatus] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (error || !roleData) {
      toast.error('Akses ditolak. Anda bukan admin.');
      navigate('/');
      return;
    }

    loadDashboardData();
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load profiles count
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Load subscriptions
      const { data: subsData } = await supabase
        .from('user_subscriptions')
        .select(`*, plan:subscription_plans(*)`)
        .order('created_at', { ascending: false });

      // Load user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role');

      // Calculate stats
      const activeCount = subsData?.filter(s => s.status === 'active').length || 0;
      const pendingCount = subsData?.filter(s => s.status === 'pending_approval').length || 0;
      
      // Expiring in 7 days
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringCount = subsData?.filter(s => {
        if (s.status !== 'active' || !s.end_date) return false;
        const endDate = new Date(s.end_date);
        return endDate >= now && endDate <= in7Days;
      }).length || 0;

      // Count roles
      const coachCount = rolesData?.filter(r => r.role === 'coach').length || 0;
      const athleteCount = (profilesCount || 0) - coachCount;

      // Calculate revenue
      const totalRevenue = subsData
        ?.filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.plan?.price || 0), 0) || 0;

      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const monthlyRevenue = subsData
        ?.filter(s => {
          if (s.status !== 'active' || !s.approved_at) return false;
          const approvedDate = new Date(s.approved_at);
          return approvedDate >= monthStart && approvedDate <= monthEnd;
        })
        .reduce((sum, s) => sum + (s.plan?.price || 0), 0) || 0;

      setStats({
        totalUsers: profilesCount || 0,
        activeSubscriptions: activeCount,
        pendingVerifications: pendingCount,
        expiringSoon: expiringCount,
        coaches: coachCount,
        athletes: athleteCount,
        totalRevenue,
        monthlyRevenue,
      });

      // Get recent subscriptions with profile names
      const recentSubs = subsData?.slice(0, 10).map(s => ({
        id: s.id,
        user_id: s.user_id,
        status: s.status,
        created_at: s.created_at,
        plan: s.plan,
        profile: null as { athlete_name: string } | null,
      })) || [];

      // Fetch profiles for recent subscriptions
      const userIds = recentSubs.map(s => s.user_id);
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, athlete_name')
          .in('id', userIds);

        recentSubs.forEach(sub => {
          const profile = profilesData?.find(p => p.id === sub.user_id);
          sub.profile = profile ? { athlete_name: profile.athlete_name } : null;
        });
      }

      setRecentSubscriptions(recentSubs);

      // Subscription by status for pie chart
      const statusCounts = [
        { name: 'Aktif', value: activeCount, color: 'hsl(var(--chart-2))' },
        { name: 'Pending', value: pendingCount, color: 'hsl(var(--chart-4))' },
        { name: 'Ditolak', value: subsData?.filter(s => s.status === 'rejected').length || 0, color: 'hsl(var(--chart-1))' },
        { name: 'Kadaluarsa', value: subsData?.filter(s => s.status === 'expired').length || 0, color: 'hsl(var(--chart-3))' },
      ].filter(s => s.value > 0);

      setSubscriptionsByStatus(statusCounts);

      // Simulate user growth data (last 7 days)
      const growthData: UserGrowthData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        growthData.push({
          date: format(date, 'dd MMM', { locale: id }),
          users: Math.floor(Math.random() * 5) + (profilesCount || 0) - (i * 2),
        });
      }
      setUserGrowth(growthData);

    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Menunggu Bayar</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Clock className="w-3 h-3 mr-1" /> Perlu Verifikasi</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><Check className="w-3 h-3 mr-1" /> Aktif</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Kadaluarsa</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">Kelola pengguna dan langganan aplikasi</p>
            </div>
            <Button asChild>
              <Link to="/admin/subscriptions">
                Kelola Langganan <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.coaches} pelatih, {stats.athletes} atlet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Langganan Aktif</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.expiringSoon > 0 && (
                    <span className="text-orange-500">{stats.expiringSoon} berakhir dalam 7 hari</span>
                  )}
                  {stats.expiringSoon === 0 && 'Semua aman'}
                </p>
              </CardContent>
            </Card>

            <Card className={stats.pendingVerifications > 0 ? 'ring-2 ring-orange-500' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Perlu Verifikasi</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pendingVerifications}</div>
                {stats.pendingVerifications > 0 && (
                  <Button size="sm" variant="link" className="p-0 h-auto text-xs" asChild>
                    <Link to="/admin/subscriptions">Verifikasi sekarang →</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(stats.monthlyRevenue)} bulan ini
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pertumbuhan Pengguna</CardTitle>
                <CardDescription>7 hari terakhir</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subscription Status Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Langganan</CardTitle>
                <CardDescription>Distribusi status saat ini</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionsByStatus.length === 0 ? (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Belum ada data langganan
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={subscriptionsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {subscriptionsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Subscriptions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Langganan Terbaru</CardTitle>
                <CardDescription>10 langganan terakhir</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/subscriptions">Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentSubscriptions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Belum ada langganan.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSubscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.profile?.athlete_name || sub.user_id.slice(0, 8) + '...'}
                        </TableCell>
                        <TableCell>{sub.plan?.name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(sub.created_at), 'dd MMM yyyy', { locale: id })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/subscriptions')}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-full bg-primary/10">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Kelola Langganan</h3>
                  <p className="text-sm text-muted-foreground">Verifikasi dan kelola langganan</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/athlete-management')}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Manajemen User</h3>
                  <p className="text-sm text-muted-foreground">Kelola atlet dan pelatih</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/laporan')}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-full bg-green-500/10">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Lihat Laporan</h3>
                  <p className="text-sm text-muted-foreground">Analisis data aplikasi</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
