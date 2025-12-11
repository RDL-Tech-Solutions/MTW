import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Ticket, 
  FolderTree, 
  Users, 
  BarChart3 
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Produtos', href: '/products', icon: Package },
  { name: 'Cupons', href: '/coupons', icon: Ticket },
  { name: 'Categorias', href: '/categories', icon: FolderTree },
  { name: 'Usuários', href: '/users', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-secondary text-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">MTW Promo</h1>
        <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
      </div>

      <nav className="mt-6 px-3">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
