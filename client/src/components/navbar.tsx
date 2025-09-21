import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div className="container">
        <Link href="/" className="navbar-brand text-primary fw-bold" data-testid="navbar-brand">
          <i className="bi bi-chat-square-text-fill me-2"></i>
          Consulta Ciudadana Honduras
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          data-testid="navbar-toggle"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link 
                href="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                data-testid="nav-consultation"
              >
                <i className="bi bi-pencil-square me-1"></i>Consulta
              </Link>
            </li>
            
            {user && (user.role === 'admin' || user.role === 'super_admin') && (
              <li className="nav-item">
                <Link 
                  href="/dashboard" 
                  className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                  data-testid="nav-dashboard"
                >
                  <i className="bi bi-graph-up me-1"></i>Dashboard
                </Link>
              </li>
            )}
            
            {user && user.role === 'super_admin' && (
              <li className="nav-item">
                <Link 
                  href="/admin" 
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                  data-testid="nav-admin"
                >
                  <i className="bi bi-people-fill me-1"></i>Administración
                </Link>
              </li>
            )}
            
            {user ? (
              <li className="nav-item">
                <button 
                  className="nav-link btn btn-link" 
                  onClick={handleLogout}
                  data-testid="nav-logout"
                >
                  <i className="bi bi-box-arrow-right me-1"></i>Salir
                </button>
              </li>
            ) : (
              <li className="nav-item">
                <Link 
                  href="/auth" 
                  className={`nav-link ${isActive('/auth') ? 'active' : ''}`}
                  data-testid="nav-login"
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i>Iniciar Sesión
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
