import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const AdminUsers: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Usuário criado com sucesso!');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ textAlign: 'center' }}>Cadastrar Novo Usuário</h2>
      <form onSubmit={handleCreateUser}>
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
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="form-input"
          />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: 16 }}>{success}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4 }}>
          {loading ? 'Aguarde...' : 'Cadastrar Usuário'}
        </button>
      </form>
    </div>
  );
};

export default AdminUsers;
