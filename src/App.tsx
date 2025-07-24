import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import Receipts from './pages/Receipts';
import ReceiptDetail from './pages/ReceiptDetail';
import Reports from './pages/Reports';
import AddClient from './pages/AddClient';
import AddLoan from './pages/AddLoan';
import PixKeys from './pages/PixKeys';
import { useSupabase } from './contexts/SupabaseContext';
import { useEffect, useState } from 'react';
import LoadingScreen from './components/LoadingScreen';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import AdminUsers from './pages/AdminUsers';
import OverdueLoans from './pages/OverdueLoans';

function App() {
  const { isLoaded } = useSupabase();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    if (isLoaded) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin-users" element={<RequireAuth><AdminUsers /></RequireAuth>} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/add" element={<AddClient />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="loans" element={<Loans />} />
        <Route path="overdue-loans" element={<OverdueLoans />} />
        <Route path="loans/add" element={<AddLoan />} />
        <Route path="loans/:id" element={<LoanDetail />} />
        <Route path="receipts" element={<Receipts />} />
        <Route path="receipts/:id" element={<ReceiptDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="pix-keys" element={<PixKeys />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;