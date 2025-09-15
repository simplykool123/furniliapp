import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Shield, Edit3 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^[0-9]{10,15}$/, "Invalid phone number format"),
  role: z.enum(["admin", "manager", "staff", "store_incharge"]),
});

const editUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(), // Password is optional for editing
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^[0-9]{10,15}$/, "Invalid phone number format"),
  role: z.enum(["admin", "manager", "staff", "store_incharge"]),
  resetPassword: z.boolean().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

type UserFormData = z.infer<typeof userSchema>;

export default function Users() {
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      window.location.href = '/';
    }
  }, [currentUser]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/users');
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      name: "",
      role: "staff",
    },
  });

  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    formState: { errors: editErrors },
    reset: editReset,
    setValue: editSetValue,
    watch: editWatch,
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      name: "",
      role: "staff",
      resetPassword: false,
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (userData: EditUserFormData & { id: number }) => {
      const { id, resetPassword, ...data } = userData;
      
      // If resetPassword is true, generate a new password
      if (resetPassword) {
        data.password = 'temp123456'; // Temporary password - user should change it
      }
      
      // Remove password field if it's empty and resetPassword is false
      if (!resetPassword && !data.password) {
        delete data.password;
      }
      
      return await authenticatedApiRequest('PATCH', `/api/users/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User updated",
        description: variables.resetPassword 
          ? "User has been updated and password reset to 'temp123456'. Please ask them to change it." 
          : "User has been updated successfully.",
      });
      setShowEditUser(false);
      setEditingUser(null);
      editReset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      return await authenticatedApiRequest('POST', '/api/auth/register', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User created",
        description: "User has been created successfully.",
      });
      setShowAddUser(false);
      reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      // Soft delete by setting isActive to false
      return await authenticatedApiRequest('PATCH', `/api/users/${id}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setUserToDelete(null);
      toast({
        title: "Staff member moved to inactive",
        description: "The staff member has been moved to inactive list. Their data and history are preserved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to deactivate staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await authenticatedApiRequest('PATCH', `/api/users/${id}`, { isActive });
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: isActive ? "Staff member activated" : "Staff member deactivated",
        description: isActive 
          ? "The staff member has been reactivated and can now access the system."
          : "The staff member has been deactivated and cannot access the system.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update staff status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: EditUserFormData) => {
    if (editingUser) {
      editUserMutation.mutate({ ...data, id: editingUser.id });
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    editSetValue('username', user.username);
    editSetValue('email', user.email);
    editSetValue('name', user.name);
    editSetValue('phone', user.phone || '');
    editSetValue('role', user.role);
    editSetValue('password', '');
    editSetValue('resetPassword', false);
    setShowEditUser(true);
  };

  // Filter users based on active status
  const filteredUsers = users?.filter((user: any) => {
    if (activeFilter === 'active') return user.isActive;
    if (activeFilter === 'inactive') return !user.isActive;
    return true; // 'all'
  }) || [];

  const getRoleBadge = (role: string) => {
    const roleInfo = {
      admin: { style: "bg-red-100 text-red-800 hover:bg-red-100", label: "🔑 Admin", desc: "Full Access" },
      staff: { style: "bg-blue-100 text-blue-800 hover:bg-blue-100", label: "👷 Staff", desc: "Daily Operations" },
      store_incharge: { style: "bg-green-100 text-green-800 hover:bg-green-100", label: "🧰 Store Incharge", desc: "Inventory Manager" },
    };
    
    const info = roleInfo[role as keyof typeof roleInfo] || roleInfo.staff;
    
    return (
      <Badge className={info.style}>
        <Shield className="w-3 h-3 mr-1" />
        {info.label}
      </Badge>
    );
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <ResponsiveLayout
      title="System Users"
      subtitle="Manage user accounts and roles"
    >
      <div className="space-y-6">
        {/* Add User Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">({filteredUsers?.length || 0} users)</h2>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg p-1 bg-gray-50">
              <button
                onClick={() => setActiveFilter('active')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'active' 
                    ? 'bg-white text-green-700 shadow-sm' 
                    : 'text-gray-600 hover:text-green-700'
                }`}
              >
                Active Staff
              </button>
              <button
                onClick={() => setActiveFilter('inactive')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'inactive' 
                    ? 'bg-white text-red-700 shadow-sm' 
                    : 'text-gray-600 hover:text-red-700'
                }`}
              >
                Inactive Staff
              </button>
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'all' 
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-gray-600 hover:text-blue-700'
                }`}
              >
                All Staff
              </button>
            </div>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {activeFilter === 'active' && 'No active staff members found'}
                        {activeFilter === 'inactive' && 'No inactive staff members found'}
                        {activeFilter === 'all' && 'No staff members found'}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-600">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'Not provided'}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </Button>
                          
                          {/* Toggle Active/Inactive Status */}
                          <Button
                            variant={user.isActive ? "outline" : "default"}
                            size="sm"
                            onClick={() => {
                              if (user.id === currentUser?.id) {
                                toast({
                                  title: "Cannot deactivate yourself",
                                  description: "You cannot deactivate your own account.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              const action = user.isActive ? "deactivate" : "activate";
                              if (confirm(`${action === "deactivate" ? "⚠️ Deactivate" : "✅ Activate"} Staff Member\n\nAre you sure you want to ${action} "${user.name}"?\n\n${action === "deactivate" 
                                ? "They will lose access to the system but their data will be preserved." 
                                : "They will regain access to the system with their existing role and permissions."}`)) {
                                toggleUserStatusMutation.mutate({ 
                                  id: user.id, 
                                  isActive: !user.isActive 
                                });
                              }
                            }}
                            disabled={user.id === currentUser?.id || toggleUserStatusMutation.isPending}
                          >
                            {user.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          
                          {/* Delete - Moves to inactive status */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (user.id === currentUser?.id) {
                                toast({
                                  title: "Cannot delete yourself",
                                  description: "You cannot delete your own account.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setUserToDelete(user);
                            }}
                            disabled={user.id === currentUser?.id || deleteUserMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Add User Dialog */}
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="add-user-description">
            <DialogHeader className="pb-3">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-4 h-4" />
                Add New User
              </DialogTitle>
              <p id="add-user-description" className="sr-only">
                Form to create a new user account with name, email, and role
              </p>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs font-medium">Full Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    className={`h-8 text-sm ${errors.name ? "border-red-500" : ""}`}
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="username" className="text-xs font-medium">Username *</Label>
                  <Input
                    id="username"
                    {...register("username")}
                    className={`h-8 text-sm ${errors.username ? "border-red-500" : ""}`}
                    placeholder="johndoe"
                  />
                  {errors.username && (
                    <p className="text-xs text-red-600">{errors.username.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={`h-8 text-sm ${errors.email ? "border-red-500" : ""}`}
                  placeholder="john@company.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-medium">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  className={`h-8 text-sm ${errors.phone ? "border-red-500" : ""}`}
                  placeholder="9876543210"
                />
                {errors.phone && (
                  <p className="text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-medium">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  className={`h-8 text-sm ${errors.password ? "border-red-500" : ""}`}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="role" className="text-xs font-medium">Role *</Label>
                <Select 
                  value={watch("role")}
                  onValueChange={(value) => setValue("role", value as any)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">🔑 Admin (Full Access)</SelectItem>
                    <SelectItem value="manager">👔 Manager (Project Management)</SelectItem>
                    <SelectItem value="staff">👷 Staff (Daily Operations)</SelectItem>
                    <SelectItem value="store_incharge">🧰 Store Incharge (Inventory Manager)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-xs text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowAddUser(false)} className="h-8 px-3 text-sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending} className="h-8 px-3 text-sm">
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
          <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-3">
              <DialogTitle className="text-lg">Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={editHandleSubmit(onEditSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="edit-username" className="text-xs font-medium">Username</Label>
                <Input
                  id="edit-username"
                  {...editRegister("username")}
                  placeholder="Enter username"
                  className="h-8 text-sm"
                />
                {editErrors.username && (
                  <p className="text-xs text-red-600">{editErrors.username.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-email" className="text-xs font-medium">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...editRegister("email")}
                  placeholder="Enter email address"
                  className="h-8 text-sm"
                />
                {editErrors.email && (
                  <p className="text-xs text-red-600">{editErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-phone" className="text-xs font-medium">Phone Number</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  {...editRegister("phone")}
                  placeholder="Enter phone number"
                  className="h-8 text-sm"
                />
                {editErrors.phone && (
                  <p className="text-xs text-red-600">{editErrors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-name" className="text-xs font-medium">Full Name</Label>
                <Input
                  id="edit-name"
                  {...editRegister("name")}
                  placeholder="Enter full name"
                  className="h-8 text-sm"
                />
                {editErrors.name && (
                  <p className="text-xs text-red-600">{editErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-role" className="text-xs font-medium">Role</Label>
                <Select onValueChange={(value) => editSetValue("role", value as any)} value={editWatch("role")}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">🔑 Admin (Full Access)</SelectItem>
                    <SelectItem value="manager">👔 Manager (Project Management)</SelectItem>
                    <SelectItem value="staff">👷 Staff (Daily Operations)</SelectItem>
                    <SelectItem value="store_incharge">🧰 Store Incharge (Inventory Manager)</SelectItem>
                  </SelectContent>
                </Select>
                {editErrors.role && (
                  <p className="text-xs text-red-600">{editErrors.role.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="reset-password"
                    {...editRegister("resetPassword")}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="reset-password" className="text-xs font-medium">
                    Reset password to 'temp123456'
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  Check this to reset the user's password. They will need to change it after login.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditUser(false);
                  setEditingUser(null);
                  editReset();
                }} className="h-8 px-3 text-sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={editUserMutation.isPending} className="h-8 px-3 text-sm">
                  {editUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will deactivate "{userToDelete?.name}" and move them to inactive status. They will lose access to the system but their data and history will be preserved. You can reactivate them later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>
                No, Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? "Deactivating..." : "Yes, Deactivate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ResponsiveLayout>
  );
}
