import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export default function Header({ onMenuClick, isMobile = false }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-card border-b flex-shrink-0">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        {/* Lado Esquerdo: Menu Hamburguer + Título */}
        <div className="flex items-center gap-3">
          {/* Botão Menu Hamburguer - só mobile */}
          {isMobile && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}

          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold truncate max-w-[180px] sm:max-w-none">
              {isMobile ? `Olá, ${user?.name?.split(' ')[0] || 'Admin'}` : `Bem-vindo, ${user?.name || 'Admin'}`}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Painel Administrativo PreçoCerto
            </p>
          </div>
        </div>

        {/* Lado Direito: Info Usuário + Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Info do Usuário - compacta em mobile */}
          <div className="hidden sm:flex items-center gap-3 px-3 sm:px-4 py-2 bg-muted rounded-lg">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div className="text-xs sm:text-sm">
              <div className="font-medium truncate max-w-[120px] md:max-w-none">{user?.email}</div>
              {user?.role === 'admin' && (
                <Badge variant="destructive" className="mt-1 text-[10px] sm:text-xs">
                  <Shield className="mr-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Admin
                </Badge>
              )}
            </div>
          </div>

          {/* Avatar compacto para mobile */}
          {isMobile && (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}

          {/* Botão Logout */}
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            onClick={handleLogout}
            className="h-9 sm:h-10"
          >
            <LogOut className={`h-4 w-4 ${isMobile ? '' : 'mr-2'}`} />
            {!isMobile && <span>Sair</span>}
          </Button>
        </div>
      </div>
    </header>
  );
}
