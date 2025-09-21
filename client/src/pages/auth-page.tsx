import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, MessageSquare, BarChart3 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

const registerSchema = z.object({
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["admin", "super_admin"]),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "admin",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-light">
      <div className="container">
        <div className="row min-vh-100">
          {/* Left Column - Auth Forms */}
          <div className="col-lg-6 d-flex align-items-center">
            <div className="w-100">
              <div className="text-center mb-4">
                <h1 className="text-primary fw-bold mb-2">
                  <i className="bi bi-chat-square-text-fill me-2"></i>
                  Consulta Ciudadana Honduras
                </h1>
                <p className="text-muted">Acceso para administradores del sistema</p>
              </div>

              <Card className="mx-auto" style={{ maxWidth: "400px" }}>
                <CardHeader>
                  <CardTitle className="text-center">
                    <ShieldCheck className="w-6 h-6 me-2 text-primary" />
                    Acceso Administrativo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-100 grid-cols-2">
                      <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                      <TabsTrigger value="register">Registrarse</TabsTrigger>
                    </TabsList>

                    {/* Login Tab */}
                    <TabsContent value="login">
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <div className="mb-3">
                          <Label htmlFor="loginUsername">Usuario</Label>
                          <Input
                            id="loginUsername"
                            {...loginForm.register("username")}
                            data-testid="input-loginUsername"
                          />
                          {loginForm.formState.errors.username && (
                            <div className="text-danger small">
                              {loginForm.formState.errors.username.message}
                            </div>
                          )}
                        </div>

                        <div className="mb-3">
                          <Label htmlFor="loginPassword">Contraseña</Label>
                          <Input
                            id="loginPassword"
                            type="password"
                            {...loginForm.register("password")}
                            data-testid="input-loginPassword"
                          />
                          {loginForm.formState.errors.password && (
                            <div className="text-danger small">
                              {loginForm.formState.errors.password.message}
                            </div>
                          )}
                        </div>

                        <div className="d-grid">
                          <Button
                            type="submit"
                            disabled={loginMutation.isPending}
                            data-testid="button-login"
                          >
                            {loginMutation.isPending ? (
                              <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            ) : (
                              <i className="bi bi-box-arrow-in-right me-2"></i>
                            )}
                            Iniciar Sesión
                          </Button>
                        </div>
                      </form>
                    </TabsContent>

                    {/* Register Tab */}
                    <TabsContent value="register">
                      <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                        <div className="mb-3">
                          <Label htmlFor="registerUsername">Usuario</Label>
                          <Input
                            id="registerUsername"
                            {...registerForm.register("username")}
                            data-testid="input-registerUsername"
                          />
                          {registerForm.formState.errors.username && (
                            <div className="text-danger small">
                              {registerForm.formState.errors.username.message}
                            </div>
                          )}
                        </div>

                        <div className="mb-3">
                          <Label htmlFor="registerPassword">Contraseña</Label>
                          <Input
                            id="registerPassword"
                            type="password"
                            {...registerForm.register("password")}
                            data-testid="input-registerPassword"
                          />
                          {registerForm.formState.errors.password && (
                            <div className="text-danger small">
                              {registerForm.formState.errors.password.message}
                            </div>
                          )}
                        </div>

                        <div className="mb-3">
                          <Label htmlFor="registerRole">Rol</Label>
                          <Select
                            onValueChange={(value) => 
                              registerForm.setValue("role", value as "admin" | "super_admin")
                            }
                          >
                            <SelectTrigger data-testid="select-registerRole">
                              <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador/Planificador</SelectItem>
                              <SelectItem value="super_admin">Super Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                          {registerForm.formState.errors.role && (
                            <div className="text-danger small">
                              {registerForm.formState.errors.role.message}
                            </div>
                          )}
                        </div>

                        <div className="d-grid">
                          <Button
                            type="submit"
                            disabled={registerMutation.isPending}
                            data-testid="button-register"
                          >
                            {registerMutation.isPending ? (
                              <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            ) : (
                              <i className="bi bi-person-plus me-2"></i>
                            )}
                            Crear Cuenta
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Hero Section */}
          <div className="col-lg-6 bg-primary text-white d-flex align-items-center d-none d-lg-flex">
            <div className="text-center w-100 p-5">
              <div className="mb-4">
                <i className="bi bi-graph-up display-1"></i>
              </div>
              <h2 className="fw-bold mb-4">Panel Administrativo</h2>
              <p className="lead mb-4">
                Gestiona las consultas ciudadanas, analiza tendencias y toma decisiones informadas
                para el desarrollo de Honduras.
              </p>
              
              <div className="row text-center">
                <div className="col-4">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <h6>Consultas</h6>
                  <p className="small">Gestión completa de consultas ciudadanas</p>
                </div>
                <div className="col-4">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                  <h6>Analytics</h6>
                  <p className="small">Dashboards interactivos con métricas</p>
                </div>
                <div className="col-4">
                  <i className="bi bi-download fs-1 mb-2 d-block"></i>
                  <h6>Reportes</h6>
                  <p className="small">Exportación en múltiples formatos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
