import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, Upload, Clock, AlertCircle, CreditCard } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  description: string;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  payment_proof_url: string | null;
  payment_notes: string | null;
  rejection_reason: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  plan: SubscriptionPlan;
}

const Subscription = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUserId(user.id);
    loadData(user.id);
  };

  const loadData = async (uid: string) => {
    setLoading(true);
    try {
      // Load plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('duration_months');

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Load current subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;
      setCurrentSubscription(subData as UserSubscription | null);
    } catch (error: any) {
      console.error('Error loading data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'pending_payment'
        });

      if (error) throw error;
      
      toast.success('Paket dipilih! Silakan upload bukti pembayaran.');
      loadData(userId);
    } catch (error: any) {
      toast.error('Gagal memilih paket: ' + error.message);
    }
  };

  const handleUploadPaymentProof = async () => {
    if (!paymentProof || !currentSubscription || !userId) return;

    setUploading(true);
    try {
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `${userId}/${currentSubscription.id}-${Date.now()}.${fileExt}`;

      // Check if file already exists and remove it first
      const { data: existingFiles } = await supabase.storage
        .from('payment-proofs')
        .list(userId);

      const existingFile = existingFiles?.find(f => f.name.startsWith(currentSubscription.id));
      if (existingFile) {
        await supabase.storage
          .from('payment-proofs')
          .remove([`${userId}/${existingFile.name}`]);
      }

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, paymentProof, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Store the file path (not public URL) for signed URL generation later
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          payment_proof_url: fileName,
          payment_notes: paymentNotes,
          status: 'pending_approval'
        })
        .eq('id', currentSubscription.id);

      if (updateError) throw updateError;

      toast.success('Bukti pembayaran berhasil diupload! Menunggu konfirmasi admin.');
      loadData(userId);
      setPaymentProof(null);
      setPaymentNotes('');
    } catch (error: any) {
      toast.error('Gagal upload: ' + error.message);
    } finally {
      setUploading(false);
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
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Menunggu Pembayaran</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Menunggu Konfirmasi</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><Check className="w-3 h-3 mr-1" /> Aktif</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Kadaluarsa</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Ditolak</Badge>;
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
    <div className="min-h-screen bg-background pb-bottom-nav">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Pilih Paket Langganan</h1>
            <p className="text-muted-foreground">Akses penuh ke semua fitur HIROCROSS_TRAIN</p>
          </div>

          {/* Current Subscription Status */}
          {currentSubscription && (
            <Card className="mb-8 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Status Langganan Anda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Paket</p>
                    <p className="font-semibold">{currentSubscription.plan?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(currentSubscription.status)}
                  </div>
                  {currentSubscription.status === 'active' && currentSubscription.end_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Berlaku Hingga</p>
                      <p className="font-semibold">{new Date(currentSubscription.end_date).toLocaleDateString('id-ID')}</p>
                    </div>
                  )}
                </div>

                {currentSubscription.status === 'rejected' && currentSubscription.rejection_reason && (
                  <div className="p-4 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive">Alasan Penolakan:</p>
                    <p className="text-sm">{currentSubscription.rejection_reason}</p>
                  </div>
                )}

                {/* Payment Upload Form */}
                {(currentSubscription.status === 'pending_payment' || currentSubscription.status === 'rejected') && (
                  <div className="mt-4 p-4 border rounded-lg space-y-4">
                    <h3 className="font-semibold">Upload Bukti Pembayaran</h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Transfer ke:</p>
                      <p className="text-sm">Bank Mandiri: 1370020414021</p>
                      <p className="text-sm">a.n. Nafisa Arif Pambudi</p>
                      <p className="text-sm font-semibold mt-2">Total: {formatPrice(currentSubscription.plan?.price || 0)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-proof">Bukti Transfer</Label>
                      <Input
                        id="payment-proof"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-notes">Catatan (opsional)</Label>
                      <Textarea
                        id="payment-notes"
                        placeholder="Nama pengirim, nominal, dll."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleUploadPaymentProof} 
                      disabled={!paymentProof || uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <span className="animate-spin mr-2">⏳</span>
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload Bukti Pembayaran
                    </Button>
                  </div>
                )}

                {currentSubscription.status === 'pending_approval' && (
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-sm text-blue-600">
                      Bukti pembayaran Anda sedang dalam proses verifikasi. Mohon tunggu konfirmasi dari admin.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Plans Grid - Show only if no active subscription */}
          {(!currentSubscription || currentSubscription.status === 'expired' || currentSubscription.status === 'rejected') && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative transition-all hover:border-primary/50 ${
                    plan.duration_months === 12 ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                >
                  {plan.duration_months === 12 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Terbaik</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {formatPrice(plan.price)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(plan.price / plan.duration_months)}/bulan
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={plan.duration_months === 12 ? 'default' : 'outline'}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      Pilih Paket
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Subscription;
