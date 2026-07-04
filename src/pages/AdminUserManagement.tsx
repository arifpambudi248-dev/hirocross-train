import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Users, Shield, UserCog, Search, Edit, Ban, 
  CheckCircle, Key, Loader2, RefreshCcw, AlertTriangle, Trash2, MailCheck
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  email_confirmed_at: string | null;
  confirmed_at?: string | null;
  user_metadata: {
    athlete_name?: string;
    role?: string;
  };
  profile?: {
    athlete_name: string;
    avatar_url: string | null;
  };
  role?: string;
}

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [editRoleDialog, setEditRoleDialog] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [inactiveDays, setInactiveDays] = useState<number>(60);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const isInactive = (u: UserData) => {
    const lastActivity = u.last_sign_in_at || u.created_at;
    if (!lastActivity) return true;
    const days = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    return days >= inactiveDays;
  };

  const isUnconfirmed = (u: UserData) => !u.email_confirmed_at && !u.confirmed_at;


  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      toast.error('Akses ditolak. Anda bukan admin.');
      navigate('/');
      return;
    }

    loadUsers();
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get all users from edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ action: 'list_users' })
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      const authUsers = result.users || [];

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, athlete_name, avatar_url');

      // Get roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Merge data
      const mergedUsers: UserData[] = authUsers.map((au: any) => {
        const profile = profiles?.find(p => p.id === au.id);
        const roleData = roles?.find(r => r.user_id === au.id);
        return {
          ...au,
          profile: profile || undefined,
          role: roleData?.role || 'athlete'
        };
      });

      setUsers(mergedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email?.toLowerCase().includes(query) ||
        u.profile?.athlete_name?.toLowerCase().includes(query) ||
        u.user_metadata?.athlete_name?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(u => !u.banned_until);
    } else if (statusFilter === 'suspended') {
      filtered = filtered.filter(u => u.banned_until);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(u => isInactive(u) && !u.banned_until);
    } else if (statusFilter === 'unconfirmed') {
      filtered = filtered.filter(u => isUnconfirmed(u));
    }

    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ action: 'delete_user', user_id: selectedUser.id })
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success('Akun berhasil dihapus');
      setDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Gagal menghapus akun');
    } finally {
      setActionLoading(false);
    }
  };


  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const selectAllInactive = () => {
    const inactiveIds = users.filter(u => isInactive(u) && !u.banned_until).map(u => u.id);
    setSelectedIds(new Set(inactiveIds));
    toast.success(`${inactiveIds.length} akun tidak aktif dipilih`);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setActionLoading(true);
    setBulkProgress({ done: 0, total: ids.length });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let success = 0;
      let failed = 0;
      for (const uid of ids) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ action: 'delete_user', user_id: uid })
            }
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          success++;
        } catch (e) {
          failed++;
          console.error('Bulk delete error for', uid, e);
        }
        setBulkProgress({ done: success + failed, total: ids.length });
      }

      if (failed === 0) {
        toast.success(`${success} akun berhasil dihapus`);
      } else {
        toast.warning(`${success} berhasil, ${failed} gagal dihapus`);
      }
      setBulkDeleteDialog(false);
      setSelectedIds(new Set());
      loadUsers();
    } finally {
      setActionLoading(false);
      setBulkProgress(null);
    }
  };

  const handleConfirmUser = async (u: UserData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'confirm_user', user_id: u.id })
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success('Email dikonfirmasi');
      loadUsers();
    } catch (e: any) {
      toast.error(e.message || 'Gagal konfirmasi email');
    }
  };

  const handleConfirmAllUnconfirmed = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'confirm_all_unconfirmed' })
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.failed > 0) {
        toast.warning(`${result.confirmed} dikonfirmasi, ${result.failed} gagal (dari ${result.total})`);
      } else {
        toast.success(`${result.confirmed} akun berhasil dikonfirmasi`);
      }
      loadUsers();
    } catch (e: any) {
      toast.error(e.message || 'Gagal konfirmasi massal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            action: 'update_role',
            user_id: selectedUser.id,
            new_role: newRole
          })
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success(`Role berhasil diubah ke ${newRole}`);
      setEditRoleDialog(false);
      setSelectedUser(null);
      setNewRole('');
      loadUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Gagal mengubah role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async (user: UserData) => {
    if (!confirm(`Suspend akun ${user.profile?.athlete_name || user.email}?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            action: 'suspend_user',
            user_id: user.id
          })
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success('Akun berhasil di-suspend');
      loadUsers();
    } catch (error: any) {
      console.error('Error suspending user:', error);
      toast.error(error.message || 'Gagal suspend akun');
    }
  };

  const handleActivateUser = async (user: UserData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            action: 'activate_user',
            user_id: user.id
          })
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success('Akun berhasil diaktifkan');
      loadUsers();
    } catch (error: any) {
      console.error('Error activating user:', error);
      toast.error(error.message || 'Gagal aktifkan akun');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            action: 'reset_password',
            user_id: selectedUser.id,
            new_password: newPassword
          })
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success('Password berhasil direset');
      setResetPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Gagal reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>;
      case 'coach':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30"><UserCog className="w-3 h-3 mr-1" /> Pelatih</Badge>;
      default:
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><Users className="w-3 h-3 mr-1" /> Atlet</Badge>;
    }
  };

  const getStatusBadge = (user: UserData) => {
    if (user.banned_until) {
      return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" /> Suspended</Badge>;
    }
    if (isUnconfirmed(user)) {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><MailCheck className="w-3 h-3 mr-1" /> Belum Konfirmasi</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Aktif</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                <UserCog className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary" />
                Manajemen User
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Kelola pengguna, role, dan akses akun
              </p>
            </div>
            <Button onClick={loadUsers} variant="outline" size="sm" className="w-full sm:w-auto">
              <RefreshCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 lg:pt-6">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{users.length}</div>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">Total User</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:pt-6">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                  {users.filter(u => u.role === 'admin').length}
                </div>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">Admin</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:pt-6">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'coach').length}
                </div>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">Pelatih</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:pt-6">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                  {users.filter(u => u.role === 'athlete').length}
                </div>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">Atlet</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:pt-6">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                  {users.filter(u => isInactive(u) && !u.banned_until).length}
                </div>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">Tidak Aktif ({inactiveDays}+ hari)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 lg:pt-6">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
                  {users.filter(u => isUnconfirmed(u)).length}
                </div>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">Belum Terkonfirmasi</p>
              </CardContent>
            </Card>

          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-3 sm:pt-4 lg:pt-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-10 text-sm"
                  />
                </div>
                <div className="flex gap-2 sm:gap-4">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] text-xs sm:text-sm">
                      <SelectValue placeholder="Filter Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Role</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="coach">Pelatih</SelectItem>
                      <SelectItem value="athlete">Atlet</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Tidak Aktif ({inactiveDays}+ hari)</SelectItem>
                      <SelectItem value="unconfirmed">Belum Terkonfirmasi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={String(inactiveDays)} onValueChange={(v) => setInactiveDays(Number(v))}>
                    <SelectTrigger className="w-full sm:w-[160px] text-xs sm:text-sm">
                      <SelectValue placeholder="Ambang tidak aktif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 hari</SelectItem>
                      <SelectItem value="60">60 hari</SelectItem>
                      <SelectItem value="90">90 hari</SelectItem>
                      <SelectItem value="180">180 hari</SelectItem>
                      <SelectItem value="365">1 tahun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Bulk Action Toolbar */}
          <Card className={selectedIds.size > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Checkbox
                  checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id))}
                  onCheckedChange={(c) => toggleSelectAllFiltered(!!c)}
                />
                <span>
                  {selectedIds.size > 0
                    ? `${selectedIds.size} akun dipilih`
                    : `Pilih semua (${filteredUsers.length} tampil)`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={selectAllInactive}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Pilih Semua Tidak Aktif ({inactiveDays}+ hari)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-yellow-600 border-yellow-600 hover:bg-yellow-500/10"
                  onClick={handleConfirmAllUnconfirmed}
                  disabled={actionLoading || users.filter(u => isUnconfirmed(u)).length === 0}
                >
                  <MailCheck className="h-3 w-3 mr-1" />
                  Konfirmasi Semua Belum Terkonfirmasi ({users.filter(u => isUnconfirmed(u)).length})
                </Button>
                {selectedIds.size > 0 && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                      Batal Pilih
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteDialog(true)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus {selectedIds.size} Akun
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-sm sm:text-base lg:text-lg">Daftar Pengguna</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Menampilkan {filteredUsers.length} dari {users.length} pengguna
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-4 lg:p-6 pt-0">
              <div className="overflow-x-auto">
                {/* Mobile Card View */}
                <div className="block sm:hidden divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className={`p-3 space-y-2 ${selectedIds.has(user.id) ? 'bg-destructive/5' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onCheckedChange={() => toggleSelect(user.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profile?.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {(user.profile?.athlete_name || user.email || '?')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {user.profile?.athlete_name || user.user_metadata?.athlete_name || '-'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        {getStatusBadge(user)}
                      </div>
                      <div className="flex items-center justify-between">
                        {getRoleBadge(user.role)}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role || 'athlete');
                              setEditRoleDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedUser(user);
                              setResetPasswordDialog(true);
                            }}
                          >
                            <Key className="h-3 w-3" />
                          </Button>
                          {user.banned_until ? (
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleActivateUser(user)}>
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleSuspendUser(user)}>
                              <Ban className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => { setSelectedUser(user); setDeleteDialog(true); }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>

                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <Table className="hidden sm:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id))}
                          onCheckedChange={(c) => toggleSelectAllFiltered(!!c)}
                        />
                      </TableHead>
                      <TableHead className="text-xs lg:text-sm">Pengguna</TableHead>
                      <TableHead className="text-xs lg:text-sm hidden md:table-cell">Email</TableHead>
                      <TableHead className="text-xs lg:text-sm">Role</TableHead>
                      <TableHead className="text-xs lg:text-sm">Status</TableHead>
                      <TableHead className="text-xs lg:text-sm hidden lg:table-cell">Terdaftar</TableHead>
                      <TableHead className="text-xs lg:text-sm hidden lg:table-cell">Terakhir Login</TableHead>
                      <TableHead className="text-right text-xs lg:text-sm">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className={selectedIds.has(user.id) ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(user.id)}
                            onCheckedChange={() => toggleSelect(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                              <AvatarImage src={user.profile?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {(user.profile?.athlete_name || user.email || '?')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                              {user.profile?.athlete_name || user.user_metadata?.athlete_name || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">
                          {user.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                          {user.created_at && format(new Date(user.created_at), 'dd MMM yyyy', { locale: localeId })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                          {user.last_sign_in_at 
                            ? format(new Date(user.last_sign_in_at), 'dd MMM yyyy HH:mm', { locale: localeId })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 flex-wrap">

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.role || 'athlete');
                                setEditRoleDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" /> Role
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewPassword('');
                                setResetPasswordDialog(true);
                              }}
                            >
                              <Key className="h-3 w-3 mr-1" /> Password
                            </Button>
                            {isUnconfirmed(user) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600 border-yellow-600"
                                onClick={() => handleConfirmUser(user)}
                              >
                                <MailCheck className="h-3 w-3 mr-1" /> Konfirmasi
                              </Button>
                            )}
                            {user.banned_until ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600"
                                onClick={() => handleActivateUser(user)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" /> Aktifkan
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive"
                                onClick={() => handleSuspendUser(user)}
                              >
                                <Ban className="h-3 w-3 mr-1" /> Suspend
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive"
                              onClick={() => { setSelectedUser(user); setDeleteDialog(true); }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Hapus
                            </Button>
                          </div>

                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialog} onOpenChange={setEditRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Role Pengguna</DialogTitle>
            <DialogDescription>
              Ubah role untuk {selectedUser?.profile?.athlete_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 bg-orange-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <p className="text-sm text-orange-600">
                Mengubah role akan mempengaruhi akses pengguna ke fitur aplikasi.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role Baru</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="coach">Pelatih</SelectItem>
                  <SelectItem value="athlete">Atlet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdateRole} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password untuk {selectedUser?.profile?.athlete_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password Baru</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleResetPassword} disabled={actionLoading || newPassword.length < 6}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus Akun Permanen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{selectedUser?.profile?.athlete_name || selectedUser?.email}</strong> beserta
              seluruh data terkait (profil, sesi latihan, tes, dsb.) akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={(o) => !actionLoading && setBulkDeleteDialog(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus {selectedIds.size} Akun Sekaligus?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Anda akan menghapus <strong>{selectedIds.size}</strong> akun secara permanen beserta
                  seluruh data terkait (profil, sesi latihan, tes, dsb.). Tindakan ini <strong>tidak dapat dibatalkan</strong>.
                </p>
                <div className="max-h-40 overflow-y-auto rounded border bg-muted/30 p-2 text-xs space-y-1">
                  {users.filter(u => selectedIds.has(u.id)).slice(0, 20).map(u => (
                    <div key={u.id} className="truncate">
                      • {u.profile?.athlete_name || u.user_metadata?.athlete_name || u.email}
                      <span className="text-muted-foreground"> ({u.email})</span>
                    </div>
                  ))}
                  {selectedIds.size > 20 && (
                    <div className="text-muted-foreground italic">
                      ...dan {selectedIds.size - 20} akun lainnya
                    </div>
                  )}
                </div>
                {bulkProgress && (
                  <p className="text-xs text-muted-foreground">
                    Memproses {bulkProgress.done} / {bulkProgress.total}...
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus {selectedIds.size} Akun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>


  );
};

export default AdminUserManagement;
