import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Check, X, Eye, Clock, AlertCircle, Users, CreditCard, TrendingUp, CalendarPlus, Loader2, ImageIcon } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface SubscriptionWithUser {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  payment_proof_url: string | null;
  payment_notes: string | null;
  rejection_reason: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  plan: {
    name: string;
    duration_months: number;
    price: number;
  };
}

interface CoachAthleteRequest {
  id: string;
  coach_id: string;
  athlete_id: string;
  status: string;
  invited_by: string;
  assigned_at: string;
  coach_profile: { athlete_name: string } | null;
  athlete_profile: { athlete_name: string } | null;
}

const AdminSubscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [coachAthleteRequests, setCoachAthleteRequests] = useState<CoachAthleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithUser | null>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [loadingProofImage, setLoadingProofImage] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    active: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user is admin
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

    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all subscriptions with user profiles
      const { data: subsData, error: subsError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // Load pending coach-athlete relationships
      const { data: caData, error: caError } = await supabase
        .from('coach_athletes')
        .select('*')
        .eq('status', 'pending')
        .order('assigned_at', { ascending: false });

      if (caError) throw caError;

      setSubscriptions((subsData as unknown as SubscriptionWithUser[]) || []);
      setCoachAthleteRequests((caData as unknown as CoachAthleteRequest[]) || []);

      // Calculate stats
      const pending = subsData?.filter(s => s.status === 'pending_approval').length || 0;
      const active = subsData?.filter(s => s.status === 'active').length || 0;
      const totalRevenue = subsData
        ?.filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.plan?.price || 0), 0) || 0;

      setStats({ pending, active, totalRevenue });
    } catch (error: any) {
      console.error('Error loading data:', error.message);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (subscription: SubscriptionWithUser) => {
    setProcessing(true);
    try {
      const startDate = new Date();
      const endDate = addMonths(startDate, subscription.plan.duration_months);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Langganan berhasil disetujui!');
      loadData();
    } catch (error: any) {
      toast.error('Gagal menyetujui: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubscription || !rejectionReason.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast.success('Langganan ditolak.');
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedSubscription(null);
      loadData();
    } catch (error: any) {
      toast.error('Gagal menolak: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveCoachAthlete = async (request: CoachAthleteRequest) => {
    try {
      const { error } = await supabase
        .from('coach_athletes')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Hubungan coach-athlete disetujui!');
      loadData();
    } catch (error: any) {
      toast.error('Gagal menyetujui: ' + error.message);
    }
  };

  const handleRejectCoachAthlete = async (request: CoachAthleteRequest) => {
    try {
      const { error } = await supabase
        .from('coach_athletes')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Permintaan ditolak.');
      loadData();
    } catch (error: any) {
      toast.error('Gagal menolak: ' + error.message);
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedSubscription || extensionMonths < 1) return;

    setProcessing(true);
    try {
      // Calculate new end date based on current end_date or today if expired
      const currentEndDate = selectedSubscription.end_date 
        ? new Date(selectedSubscription.end_date) 
        : new Date();
      const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
      const newEndDate = addMonths(baseDate, extensionMonths);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          end_date: newEndDate.toISOString().split('T')[0],
          start_date: selectedSubscription.start_date || new Date().toISOString().split('T')[0]
        })
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      toast.success(`Langganan diperpanjang ${extensionMonths} bulan!`);
      setShowExtendDialog(false);
      setExtensionMonths(1);
      setSelectedSubscription(null);
      loadData();
    } catch (error: any) {
      toast.error('Gagal memperpanjang: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const loadPaymentProofImage = async (subscription: SubscriptionWithUser) => {
    if (!subscription.payment_proof_url) {
      setProofImageUrl(null);
      return;
    }

    setLoadingProofImage(true);
    try {
      // Check if it's already a full URL (legacy data)
      if (subscription.payment_proof_url.startsWith('http')) {
        setProofImageUrl(subscription.payment_proof_url);
      } else {
        // Generate signed URL for the file path
        const { data, error } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(subscription.payment_proof_url, 3600); // 1 hour expiry

        if (error) throw error;
        setProofImageUrl(data.signedUrl);
      }
    } catch (error: any) {
      console.error('Error loading payment proof:', error.message);
      setProofImageUrl(null);
      toast.error('Gagal memuat bukti pembayaran');
    } finally {
      setLoadingProofImage(false);
    }
  };

  const handleOpenProofDialog = async (subscription: SubscriptionWithUser) => {
    setSelectedSubscription(subscription);
    setShowProofDialog(true);
    await loadPaymentProofImage(subscription);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500"><Clock className="w-3 h-3 mr-1" /> Menunggu Bayar</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500"><Clock className="w-3 h-3 mr-1" /> Perlu Verifikasi</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500"><Check className="w-3 h-3 mr-1" /> Aktif</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500"><AlertCircle className="w-3 h-3 mr-1" /> Kadaluarsa</Badge>;
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

  const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending_approval');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 lg:mb-8">Admin Panel - Manajemen Langganan</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Perlu Verifikasi</CardTitle>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Langganan Aktif</CardTitle>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.active}</div>
              </CardContent>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Pendapatan</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="space-y-3 sm:space-y-4">
            <TabsList className="w-full sm:w-auto flex overflow-x-auto">
              <TabsTrigger value="pending" className="relative text-xs sm:text-sm flex-1 sm:flex-initial">
                <span className="hidden sm:inline">Perlu Verifikasi</span>
                <span className="sm:hidden">Verifikasi</span>
                {pendingSubscriptions.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                    {pendingSubscriptions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm flex-1 sm:flex-initial">
                <span className="hidden sm:inline">Semua Langganan</span>
                <span className="sm:hidden">Semua</span>
              </TabsTrigger>
              <TabsTrigger value="coach-athlete" className="relative text-xs sm:text-sm flex-1 sm:flex-initial">
                Coach-Athlete
                {coachAthleteRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                    {coachAthleteRequests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Langganan Menunggu Verifikasi</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingSubscriptions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Tidak ada langganan yang perlu diverifikasi.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Paket</TableHead>
                          <TableHead>Harga</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Catatan</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingSubscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium text-xs">
                              {sub.user_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell>{sub.plan?.name}</TableCell>
                            <TableCell>{formatPrice(sub.plan?.price || 0)}</TableCell>
                            <TableCell>
                              {format(new Date(sub.created_at), 'dd MMM yyyy', { locale: localeId })}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {sub.payment_notes || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenProofDialog(sub)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(sub)}
                                  disabled={processing}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedSubscription(sub);
                                    setShowRejectDialog(true);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>Semua Langganan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mulai</TableHead>
                        <TableHead>Berakhir</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium text-xs">
                            {sub.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{sub.plan?.name}</TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            {sub.start_date ? format(new Date(sub.start_date), 'dd MMM yyyy', { locale: localeId }) : '-'}
                          </TableCell>
                          <TableCell>
                            {sub.end_date ? format(new Date(sub.end_date), 'dd MMM yyyy', { locale: localeId }) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSubscription(sub);
                                setShowExtendDialog(true);
                              }}
                              title="Perpanjang Langganan"
                            >
                              <CalendarPlus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coach-athlete">
              <Card>
                <CardHeader>
                  <CardTitle>Permintaan Coach-Athlete</CardTitle>
                </CardHeader>
                <CardContent>
                  {coachAthleteRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Tidak ada permintaan pending.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Coach</TableHead>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Diminta Oleh</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coachAthleteRequests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>{req.coach_profile?.athlete_name || 'Unknown'}</TableCell>
                            <TableCell>{req.athlete_profile?.athlete_name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {req.invited_by === 'coach' ? 'Coach' : 'Athlete'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(req.assigned_at), 'dd MMM yyyy', { locale: localeId })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveCoachAthlete(req)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectCoachAthlete(req)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* View Payment Proof Dialog */}
      <Dialog open={showProofDialog} onOpenChange={(open) => {
        setShowProofDialog(open);
        if (!open) {
          setProofImageUrl(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran</DialogTitle>
            <DialogDescription>
              User ID: {selectedSubscription?.user_id.slice(0, 8)}... - {selectedSubscription?.plan?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingProofImage ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : proofImageUrl ? (
              <img
                src={proofImageUrl}
                alt="Bukti pembayaran"
                className="w-full max-h-[400px] object-contain rounded-lg border"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mb-2" />
                <p>Tidak ada bukti pembayaran.</p>
              </div>
            )}
            {selectedSubscription?.payment_notes && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Catatan:</p>
                <p className="text-sm">{selectedSubscription.payment_notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProofDialog(false)}>
              Tutup
            </Button>
            <Button onClick={() => {
              setShowProofDialog(false);
              if (selectedSubscription) handleApprove(selectedSubscription);
            }}>
              <Check className="w-4 h-4 mr-2" /> Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Langganan</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan untuk User ID: {selectedSubscription?.user_id.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Alasan Penolakan</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Contoh: Bukti transfer tidak valid, nominal tidak sesuai, dll."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason('');
            }}>
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
            >
              Tolak Langganan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perpanjang Langganan Manual</DialogTitle>
            <DialogDescription>
              Perpanjang masa aktif untuk User ID: {selectedSubscription?.user_id.slice(0, 8)}... - {selectedSubscription?.plan?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm"><strong>Status saat ini:</strong> {selectedSubscription?.status}</p>
              <p className="text-sm"><strong>Berakhir:</strong> {selectedSubscription?.end_date ? format(new Date(selectedSubscription.end_date), 'dd MMM yyyy', { locale: localeId }) : '-'}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension-months">Tambah Durasi (Bulan)</Label>
              <Input
                id="extension-months"
                type="number"
                min={1}
                max={24}
                value={extensionMonths}
                onChange={(e) => setExtensionMonths(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Tanggal berakhir baru: {selectedSubscription?.end_date 
                  ? format(addMonths(
                      new Date(selectedSubscription.end_date) > new Date() 
                        ? new Date(selectedSubscription.end_date) 
                        : new Date(), 
                      extensionMonths
                    ), 'dd MMM yyyy', { locale: localeId })
                  : format(addMonths(new Date(), extensionMonths), 'dd MMM yyyy', { locale: localeId })}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowExtendDialog(false);
              setExtensionMonths(1);
            }}>
              Batal
            </Button>
            <Button 
              onClick={handleExtendSubscription}
              disabled={extensionMonths < 1 || processing}
            >
              <CalendarPlus className="w-4 h-4 mr-2" /> Perpanjang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
