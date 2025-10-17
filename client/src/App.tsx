// src/App.tsx
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "./lib/queryClient";
import { ProtectedRoute } from "./lib/protected-route";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { AccessibilityButton } from "@/components/accessibility-button";

import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import UserManagement from "@/pages/user-management";
import Dashboard from "@/components/dashboard";
import Analytics from "@/pages/analytics-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <Switch>
        {/* Públicas */}
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/login" component={AuthPage} />

        {/* Privadas */}
        <ProtectedRoute
          path="/admin"
          component={Dashboard} 
          requiredRole={["admin", "super_admin", "planificador"]}
        />
        <ProtectedRoute
          path="/admin/analytics"
          component={Analytics}
          requiredRole={["admin", "super_admin", "planificador"]}
        />
        <ProtectedRoute
          path="/admin/users"
          component={UserManagement}
          requiredRole={["super_admin"]}
        />

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>

      {/* Accesibilidad flotante */}
      <AccessibilityButton />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

