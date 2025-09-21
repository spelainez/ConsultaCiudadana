import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import { Dashboard } from "@/components/dashboard";
import NotFound from "@/pages/not-found";
import { AccessibilityButton } from "@/components/accessibility-button";

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/login" component={AuthPage} />
        <ProtectedRoute 
          path="/admin" 
          component={() => <Dashboard />} 
          requiredRole={["admin", "super_admin", "planificador"]} 
        />
        <Route component={NotFound} />
      </Switch>
      <AccessibilityButton />
    </>
  );
}

function App() {
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

export default App;
