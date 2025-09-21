import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { User, Settings, LogOut, UserPlus, ChevronDown } from "lucide-react";

interface NavbarAdminProps {
  onCreatePlanificador?: () => void;
}

export function NavbarAdmin({ onCreatePlanificador }: NavbarAdminProps) {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleProfile = () => {
    // TODO: Implementar modal de perfil
    console.log("Abrir perfil");
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm mb-6">
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center py-3">
          {/* Logo/Título */}
          <div className="d-flex align-items-center">
            <h1 className="h4 mb-0 text-primary fw-bold">
              Panel Administrativo
            </h1>
          </div>

          {/* Usuario y menú */}
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small d-none d-md-inline">
              Bienvenido,
            </span>
            <span className="fw-semibold text-dark">
              {user?.username}
            </span>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="d-flex align-items-center gap-2"
                  data-testid="button-user-menu"
                >
                  <User className="w-4 h-4" />
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user?.username === "SPE" && (
                  <>
                    <DropdownMenuItem 
                      onClick={onCreatePlanificador}
                      data-testid="menu-create-planificador"
                    >
                      <UserPlus className="w-4 h-4 me-2" />
                      Crear Usuario Planificador
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem 
                  onClick={handleProfile}
                  data-testid="menu-profile"
                >
                  <Settings className="w-4 h-4 me-2" />
                  Mi Perfil
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-danger"
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 me-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}