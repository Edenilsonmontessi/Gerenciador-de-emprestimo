import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      setError(result.error.message);
    } else {
      // Salva sessão local se rememberMe estiver marcado
      if (rememberMe) {
        localStorage.setItem('edenilson-remember', 'true');
      } else {
        localStorage.removeItem('edenilson-remember');
      }
      navigate('/');
    }
    setLoading(false);
  };

  React.useEffect(() => {
    // Se rememberMe estiver salvo, não pede login novamente
    if (localStorage.getItem('edenilson-remember')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate('/');
        }
      });
    }
  }, []);

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ textAlign: 'center' }}>Entrar</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Senha</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="form-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              style={{ marginLeft: 8, padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}
              tabIndex={-1}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Manter login salvo
          </label>
        </div>
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4 }}>
          {loading ? 'Aguarde...' : 'Entrar'}
        </button>
      </form>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            localStorage.removeItem('edenilson-remember');
            navigate('/login');
          }}
          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default Login;
