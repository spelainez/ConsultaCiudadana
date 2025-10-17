import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Trash2, Shield, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ---------- Tipos locales (no usar @shared/schema aquí) ----------
type UIUser = {
  id: number;
  username: string;
  rol: string; // viene desde BD
  createdAt?: string | Date | null;
};

const createUserSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  // Importante: como los roles vienen de la BD, validamos que no sea vacío.
  rol: z.string().min(1, "Debe seleccionar un rol"),
});

type CreateUserData = z.infer<typeof createUserSchema>;

export function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      rol: "", // se elegirá desde la lista de roles de la BD
    },
  });

  // ---------- Cargar roles desde la BD ----------
  const { data: roles, isLoading: isLoadingRoles } = useQuery<string[]>({
    queryKey: ["/api/roles"],
    enabled: currentUser?.rol === "super_admin",
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/roles");
      if (!res.ok) throw new Error("No se pudieron obtener los roles");
      return (await res.json()) as string[];
    },
  });

  // ---------- Listar usuarios (array plano) ----------
  const { data: users, isLoading } = useQuery<UIUser[]>({
    queryKey: ["/api/users?flat=1"],
    enabled: currentUser?.rol === "super_admin",
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users?flat=1");
      if (!res.ok) throw new Error("No se pudieron obtener los usuarios");
      return (await res.json()) as UIUser[];
    },
  });

  // ---------- Crear usuario ----------
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      // Validación dinámica: el rol debe existir en la lista cargada
      const allowed = roles ?? [];
      if (!allowed.includes(data.rol)) {
        throw new Error("Rol inválido. Seleccione un rol válido.");
      }
      const response = await apiRequest("POST", "/api/users", data);
      if (!response.ok) {
        const j = await response.json().catch(() => ({}));
        throw new Error(j?.error || "Error al crear el usuario");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users?flat=1"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Usuario creado", description: "El usuario ha sido creado exitosamente." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Error al crear el usuario" });
    },
  });

  // ---------- Eliminar usuario ----------
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!response.ok) {
        const j = await response.json().catch(() => ({}));
        throw new Error(j?.error || "Error al eliminar el usuario");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users?flat=1"] });
      toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado exitosamente." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Error al eliminar el usuario" });
    },
  });

  const onSubmit = (data: CreateUserData) => {
    createUserMutation.mutate(data);
  };

  const handleDeleteUser = (userId: string | number, username: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar al usuario "${username}"?`)) {
      deleteUserMutation.mutate(String(userId));
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "default" as const;
      case "admin":
        return "secondary" as const;
      case "ciudadano":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Administrador";
      case "ciudadano":
        return "Ciudadano";
      default:
        return role;
    }
  };

  if (currentUser?.rol !== "super_admin") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
            <p className="text-muted-foreground">Solo los Super Administradores pueden gestionar usuarios.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h2>
          <p className="text-gray-600 dark:text-gray-300">Administrar usuarios del sistema</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>Crear una nueva cuenta (roles desde la base de datos).</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de Usuario</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingrese el nombre de usuario" data-testid="input-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Ingrese la contraseña" data-testid="input-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingRoles}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder={isLoadingRoles ? "Cargando..." : "Seleccione un rol"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(roles ?? []).map((r) => (
                            <SelectItem key={r} value={r}>
                              {getRoleLabel(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit">
                    {createUserMutation.isPending ? "Creando..." : "Crear Usuario"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Usuarios del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando usuarios...</p>
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.rol)}>{getRoleLabel(user.rol)}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("es-HN") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {currentUser?.id !== user.id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={deleteUserMutation.isPending}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Tu cuenta
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay usuarios en el sistema.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
