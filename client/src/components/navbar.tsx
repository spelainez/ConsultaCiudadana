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
          Construyamos una Honduras Próspera Juntos
        </Link>
        
        <div className="d-flex ms-auto">
          <ul className="navbar-nav">
            <li className="nav-item">
              <Link 
                href="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                data-testid="nav-consultation"
              >
                <i className="bi bi-pencil-square me-1"></i>Consulta
              </Link>
            </li>
            
            {user && (user.rol === 'admin' || user.rol === 'super_admin') && (
              <li className="nav-item">
                <Link 
                  href="/admin" 
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                  data-testid="nav-admin-dashboard"
                >
                  <i className="bi bi-graph-up me-1"></i>Dashboard
                </Link>
              </li>
            )}
            
            {user && user.rol === 'super_admin' && (
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
            ) : null}
          </ul>
        </div>
      </div>
    </nav>
  );
}
