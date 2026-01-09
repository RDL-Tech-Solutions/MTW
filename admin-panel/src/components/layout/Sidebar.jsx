import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Ticket,
  FolderTree,
  Users,
  BarChart3,
  RefreshCw,
  Bot,
  Bell,
  MessageSquare,
  Settings,
  Clock,
  X
} from 'lucide-react';
import Logo from '../Logo';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Produtos', href: '/products', icon: Package },
  { name: 'Pendentes', href: '/pending-products', icon: Clock },
  { name: 'Cupons', href: '/coupons', icon: Ticket },
  { name: 'Categorias', href: '/categories', icon: FolderTree },
  { name: 'Usuários', href: '/users', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Notificações', href: '/notifications', icon: Bell },
  { name: 'Automação', href: '/auto-sync', icon: RefreshCw },
  { name: 'Agendamentos IA', href: '/scheduled-posts', icon: Clock },
  { name: 'Bots', href: '/bots', icon: Bot },
  { name: 'Canais Telegram', href: '/telegram-channels', icon: MessageSquare },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen = true, onClose, isMobile = false }) {
  const handleNavClick = () => {
    // Fechar sidebar em mobile quando clicar em um link
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`
        ${isMobile ? 'fixed' : 'relative'} 
        inset-y-0 left-0 z-50 w-64 
        bg-secondary text-white
        transform transition-transform duration-300 ease-in-out
        ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        flex flex-col
        overflow-hidden
      `}
    >
      {/* Header com Logo e Botão Fechar */}
      <div className="p-4 sm:p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-7 w-7 sm:h-8 sm:w-8" />
            <h1 className="text-xl sm:text-2xl font-bold text-primary">PreçoCerto</h1>
          </div>

          {/* Botão Fechar - só visível em mobile */}
          {isMobile && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Admin Panel</p>
      </div>

      {/* Navegação com Scroll */}
      <nav className="flex-1 overflow-y-auto px-2 sm:px-3 pb-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center px-3 sm:px-4 py-2.5 sm:py-3 mb-1 sm:mb-2 rounded-lg transition-colors text-sm sm:text-base ${isActive
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
              }`
            }
          >
            <item.icon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer da Sidebar (versão) */}
      <div className="p-3 sm:p-4 border-t border-gray-800 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">v1.0.0</p>
      </div>
    </div>
  );
}
