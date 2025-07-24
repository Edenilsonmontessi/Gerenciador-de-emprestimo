import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CreditCard, Receipt, BarChart3, X } from 'lucide-react';

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const links = [
    { icon: <Home />, text: 'Início', path: '/' },
    { icon: <Users />, text: 'Clientes', path: '/clients' },
    { icon: <CreditCard />, text: 'Empréstimos', path: '/loans' },
    { icon: <CreditCard />, text: 'Empréstimos por Data de Vencimento', path: '/overdue-loans' },
    { icon: <Receipt />, text: 'Recibos', path: '/receipts' },
    { icon: <BarChart3 />, text: 'Relatórios', path: '/reports' },
    { icon: <Receipt />, text: 'Minhas Chaves Pix', path: '/pix-keys' },
  ];

  return (
    <div className={`w-64 bg-white h-full border-r border-gray-200 ${mobile ? 'pb-6' : ''}`}>
      {mobile && (
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
          <span className="ml-2 text-lg font-medium text-gray-900">Menu</span>
        </div>
      )}
      
      <nav className="mt-5 px-2 space-y-1">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            onClick={mobile ? onClose : undefined}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              isActive(link.path)
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className={`mr-3 flex-shrink-0 h-6 w-6 ${
              isActive(link.path) 
                ? 'text-indigo-700' 
                : 'text-gray-400 group-hover:text-gray-500'
            }`}>
              {link.icon}
            </div>
            {link.text}
          </Link>
        ))}
      </nav>
      
      <div className="mt-auto pt-6 pb-3 px-4 border-t border-gray-200 relative z-0">
        <div className="text-xs text-gray-500">
          © 2025 Fernando Ysleyk
          <br />
          Sistema de Controle de Empréstimos
        </div>
      </div>
    </div>
  );
}