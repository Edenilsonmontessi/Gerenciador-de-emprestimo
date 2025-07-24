
import React, { ReactNode, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface RequireAuthProps {
  children: ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        navigate('/login');
      }
      setLoading(false);
    });
    // Escuta mudanças de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false);
        navigate('/login');
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return <div>Carregando...</div>;
  }
  if (!authenticated) {
    return null;
  }
  return <>{children}</>;
};

export default RequireAuth;
