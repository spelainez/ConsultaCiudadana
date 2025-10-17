import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Trash2,
  Key,
  UserX,
  UserCheck,
  MoreVertical,
  Settings,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

const changePasswordSchema = z
  .object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme la contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// Tipos inferidos del esquema compartido
export type CreateUserFormData = z.infer<typeof insertUserSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function UserManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // ===== Listar usuarios (manejo 401/403 sin dejar pantalla en blanco)
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (d) => d ?? [],
    retry: false,
  });

  // ===== Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserFormData) => {
      return apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuario creado", description: "El usuario ha sido creado exitosamente." });
      setShowCreateUser(false);
      createUserForm.reset({ username: "", email: "", password: "", rol: "planificador" });
    },
    onError: async (error: any) => {
      let msg = "Error al crear el usuario";
      try {
        const body = await error?.response?.json?.();
        if (body?.error) msg = body.error;
      } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado exitosamente." });
    },
    onError: async (error: any) => {
      let msg = "Error al eliminar el usuario";
      try {
        const body = await error?.response?.json?.();
        if (body?.error) msg = body.error;
      } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return apiRequest("PUT", `/api/users/${userId}/password`, { password });
    },
    onSuccess: () => {
      toast({ title: "Contraseña actualizada", description: "La contraseña ha sido actualizada exitosamente." });
      setShowChangePassword(false);
      setSelectedUser(null);
    },
    onError: async (error: any) => {
      let msg = "Error al cambiar la contraseña";
      try {
        const body = await error?.response?.json?.();
        if (body?.error) msg = body.error;
      } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      return apiRequest("PUT", `/api/users/${userId}/status`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Estado actualizado", description: "El estado del usuario ha sido actualizado exitosamente." });
    },
    onError: async (error: any) => {
      let msg = "Error al cambiar el estado del usuario";
      try {
        const body = await error?.response?.json?.();
        if (body?.error) msg = body.error;
      } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  // ===== Forms
  

  const createUserForm = useForm<CreateUserFormData>({
  resolver: zodResolver(insertUserSchema),
  defaultValues: { username: "", email: "", password: "", rol: "planificador" },
});

  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // ===== Handlers
  const handleCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("¿Está seguro que desea eliminar este usuario?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleChangePassword = (data: ChangePasswordFormData) => {
    if (selectedUser) {
      changePasswordMutation.mutate({ userId: selectedUser.id, password: data.password });
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? "suspender" : "activar";
    if (window.confirm(`¿Está seguro que desea ${action} este usuario?`)) {
      toggleUserStatusMutation.mutate({ userId, active: !currentStatus });
    }
  };

  const getRoleBadgeVariant = (rol: string) => {
    switch (rol) {
      case "super_admin":
        return "destructive" as const;
      case "admin":
        return "default" as const;
      case "planificador":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  const getRoleLabel = (rol: string) => {
    switch (rol) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Administrador";
      case "planificador":
        return "Planificador";
      case "ciudadano":
        return "Ciudadano";
      default:
        return rol;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-HN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ===== Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  // ===== Error (evita pantalla en blanco)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{String((error as any)?.message ?? "No se pudieron cargar los usuarios.")}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/users"] })}>
                Reintentar
              </Button>
              <Button onClick={() => navigate("/admin")}>Volver al panel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== UI principal
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f7fa" }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: "#1bd1e8" }}>
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="text-white hover:bg-white hover:bg-opacity-20 mr-3"
                data-testid="button-back-to-dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Settings className="w-6 h-6 text-white mr-3" />
              <h4 className="mb-0 font-bold text-white text-lg">Gestión de Usuarios</h4>
            </div>

            <div className="flex items-center text-white">
              <span className="font-medium mr-2">{user?.username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="w-full">
            {/* Users Table */}
            <Card className="border-0 shadow-sm rounded-lg">
              <CardHeader style={{ backgroundColor: "#fff" }} className="border-0 rounded-t-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="mb-0 flex items-center">
                      <Users className="w-5 h-5 mr-2" style={{ color: "#1bd1e8" }} />
                      Lista de Usuarios
                    </CardTitle>
                  </div>
                  <Button onClick={() => setShowCreateUser(true)} style={{ backgroundColor: "#1bd1e8", borderColor: "#1bd1e8" }} data-testid="button-create-user">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Crear Usuario
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Usuario</TableHead>
                        <TableHead className="font-bold">Rol</TableHead>
                        <TableHead className="font-bold">Estado</TableHead>
                        <TableHead className="font-bold">Fecha Creación</TableHead>
                        <TableHead className="font-bold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length > 0 ? (
                        users.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                  <span className="text-sm font-medium text-gray-600">{u.username?.[0]?.toUpperCase?.() ?? "U"}</span>
                                </div>
                                <div>
                                  <p className="font-medium">{u.username}</p>
                                  <p className="text-sm text-gray-500">{String(u.id).slice(0, 8)}...</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(u.rol)}>{getRoleLabel(u.rol)}</Badge>
                            </TableCell>
                            <TableCell>
<Badge variant={u.active ? "default" : "secondary"}>
    {u.active ? "Activo" : "Suspendido"}
  </Badge>                            </TableCell>
  <TableCell>
  {u.createdAt
    ? new Date(u.createdAt).toLocaleDateString("es-HN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-"}
</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid={`button-user-actions-${u.id}`}>
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => { setSelectedUser(u); setShowChangePassword(true); }}
                                    data-testid={`button-change-password-${u.id}`}
                                  >
                                    <Key className="w-4 h-4 mr-2" />
                                    Cambiar Contraseña
                                  </DropdownMenuItem>

                                  {u.username !== "SPE" && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleToggleUserStatus(u.id, u.active)} data-testid={`button-toggle-status-${u.id}`}>
                                        {u.active ? (
                                          <>
                                            <UserX className="w-4 h-4 mr-2" />
                                            Suspender
                                          </>
                                        ) : (
                                          <>
                                            <UserCheck className="w-4 h-4 mr-2" />
                                            Activar
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:bg-red-50" data-testid={`button-delete-user-${u.id}`}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                            No hay usuarios disponibles
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2" style={{ color: "#1bd1e8" }} />
              Crear Nuevo Usuario
            </DialogTitle>
            <DialogDescription>
              Complete la información para crear un nuevo usuario en el sistema.
            </DialogDescription>
          </DialogHeader>

          <Form {...createUserForm}>
            <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
              {/* Username */}
              <FormField
                control={createUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="Ingrese el nombre de usuario" data-testid="input-create-username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={createUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="usuario@dominio.com" data-testid="input-create-email" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={createUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Ingrese la contraseña" data-testid="input-create-password" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rol */}
              <FormField
                control={createUserForm.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select value={field.value ?? "planificador"} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planificador">Planificador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="ciudadano">Ciudadano</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)} data-testid="button-cancel-create">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending} style={{ backgroundColor: "#1bd1e8", borderColor: "#1bd1e8" }} data-testid="button-submit-create">
                  {createUserMutation.isPending ? "Creando..." : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2" style={{ color: "#1bd1e8" }} />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Cambiar la contraseña para el usuario: <strong>{selectedUser?.username}</strong>
            </DialogDescription>
          </DialogHeader>

          <Form {...changePasswordForm}>
            <form onSubmit={changePasswordForm.handleSubmit(handleChangePassword)} className="space-y-4">
              <FormField
                control={changePasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Ingrese la nueva contraseña" data-testid="input-new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={changePasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirme la nueva contraseña" data-testid="input-confirm-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    setSelectedUser(null);
                    changePasswordForm.reset();
                  }}
                  data-testid="button-cancel-password"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={changePasswordMutation.isPending} style={{ backgroundColor: "#1bd1e8", borderColor: "#1bd1e8" }} data-testid="button-submit-password">
                  {changePasswordMutation.isPending ? "Actualizando..." : "Cambiar Contraseña"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
