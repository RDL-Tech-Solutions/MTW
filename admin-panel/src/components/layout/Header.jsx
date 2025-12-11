import { useAuthStore } from '../../stores/authStore';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Bem-vindo, {user?.name || 'Admin'}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{user?.email}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:text-primary transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
