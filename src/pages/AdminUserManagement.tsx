import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Users, Shield, UserCog, Search, Edit, Ban, 
  CheckCircle, Key, Loader2, RefreshCcw, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
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
    }

    setFilteredUsers(filtered);
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <UserCog className="h-8 w-8 text-primary" />
                Manajemen User
              </h1>
              <p className="text-muted-foreground mt-1">
                Kelola pengguna, role, dan akses akun
              </p>
            </div>
            <Button onClick={loadUsers} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-sm text-muted-foreground">Total User</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {users.filter(u => u.role === 'admin').length}
                </div>
                <p className="text-sm text-muted-foreground">Admin</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'coach').length}
                </div>
                <p className="text-sm text-muted-foreground">Pelatih</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.role === 'athlete').length}
                </div>
                <p className="text-sm text-muted-foreground">Atlet</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
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
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Pengguna</CardTitle>
              <CardDescription>
                Menampilkan {filteredUsers.length} dari {users.length} pengguna
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Terdaftar</TableHead>
                      <TableHead>Terakhir Login</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profile?.avatar_url || ''} />
                              <AvatarFallback>
                                {(user.profile?.athlete_name || user.email || '?')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {user.profile?.athlete_name || user.user_metadata?.athlete_name || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.created_at && format(new Date(user.created_at), 'dd MMM yyyy', { locale: localeId })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.last_sign_in_at 
                            ? format(new Date(user.last_sign_in_at), 'dd MMM yyyy HH:mm', { locale: localeId })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
    </div>
  );
};

export default AdminUserManagement;
