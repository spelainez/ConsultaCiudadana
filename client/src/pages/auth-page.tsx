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
import { Loader2, ShieldCheck, MessageSquare, BarChart3, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });


  // Redirect if already logged in
  if (user) {
    return <Redirect to="/admin" />;
  }

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };


  return (
    <div className="min-h-screen bg-light">
      <div className="container">
        <div className="row min-vh-100">
          {/* Left Column - Auth Forms */}
          <div className="col-lg-6 d-flex align-items-center">
            <div className="w-100">

              <Card className="mx-auto" style={{ maxWidth: "400px" }}>
                <CardHeader>
                  <CardTitle className="text-center">
                    <ShieldCheck className="w-6 h-6 me-2 text-primary" />
                    Acceso Administrativo
                  </CardTitle>
                  <p className="text-center text-muted mb-0 small">Acceso exclusivo para administradores autorizados</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="mb-3">
                      <Label htmlFor="loginUsername">Usuario</Label>
                      <Input
                        id="loginUsername"
                        placeholder="Ingrese su nombre de usuario"
                        {...loginForm.register("username")}
                        data-testid="input-username"
                      />
                      {loginForm.formState.errors.username && (
                        <div className="text-danger small">
                          {loginForm.formState.errors.username.message}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <Label htmlFor="loginPassword">Contraseña</Label>
                      <div className="password-input-container position-relative">
                        <Input
                          id="loginPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="Ingrese su contraseña"
                          {...loginForm.register("password")}
                          data-testid="input-password"
                          className="password-input"
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="password-toggle-icon" />
                          ) : (
                            <Eye className="password-toggle-icon" />
                          )}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <div className="text-danger small">
                          {loginForm.formState.errors.password.message}
                        </div>
                      )}
                    </div>

                    <div className="d-grid mt-4">
                      <Button
                        type="submit"
                        className="btn-admin-login"
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
              <p className="lead mb-4">
                Gestiona las consultas ciudadanas, analiza tendencias y toma decisiones informadas
                para el desarrollo de Honduras.
              </p>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
