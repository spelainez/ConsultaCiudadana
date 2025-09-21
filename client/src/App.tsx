import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Navbar } from "@/components/navbar";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import { Dashboard } from "@/components/dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute 
          path="/dashboard" 
          component={() => <Dashboard />} 
          requiredRole={["admin", "super_admin"]} 
        />
        <ProtectedRoute 
          path="/admin" 
          component={() => <Dashboard />} 
          requiredRole={["super_admin"]} 
        />
        <Route component={NotFound} />
      </Switch>
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
