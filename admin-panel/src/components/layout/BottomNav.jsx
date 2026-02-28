import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Ticket, Menu } from 'lucide-react';

export default function BottomNav({ onMenuClick }) {
    const navItems = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Produtos', href: '/products', icon: Package },
        { name: 'Cupons', href: '/coupons', icon: Ticket },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t flex justify-around items-center p-2 pb-safe md:hidden shadow-lg h-16">
            {navItems.map((item) => (
                <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/80'
                        }`
                    }
                >
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[10px] sm:text-xs font-medium">{item.name}</span>
                </NavLink>
            ))}

            <button
                onClick={onMenuClick}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                aria-label="Abrir menu"
            >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[10px] sm:text-xs font-medium">Menu</span>
            </button>
        </div>
    );
}
