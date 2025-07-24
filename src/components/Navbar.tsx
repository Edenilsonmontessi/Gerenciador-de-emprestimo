import { Link, useNavigate } from 'react-router-dom';
import { Menu, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const navigate = useNavigate();

  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <button 
                type="button"
                className="md:hidden p-2 rounded-md text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={onMenuClick}
              >
                <span className="sr-only">Open menu</span>
                <Menu className="h-6 w-6" />
              </button>
              <Link to="/" className="flex items-center gap-2 ml-2 md:ml-0">
                <DollarSign className="h-8 w-8" />
                <span className="text-xl font-bold">Dinheiro Rápido</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0 hidden md:flex">
              <Link to="/clients" className="px-3 py-2 text-sm font-medium text-indigo-100 hover:text-white">
                Clientes
              </Link>
              <Link to="/loans" className="px-3 py-2 text-sm font-medium text-indigo-100 hover:text-white">
                Empréstimos
              </Link>
              <Link to="/receipts" className="px-3 py-2 text-sm font-medium text-indigo-100 hover:text-white">
                Recibos
              </Link>
              <Link to="/reports" className="px-3 py-2 text-sm font-medium text-indigo-100 hover:text-white">
                Relatórios
              </Link>
            </div>
            <button
              className="ml-4 px-3 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 rounded text-white"
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem('edenilson-remember');
                navigate('/login');
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}