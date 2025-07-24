import { DollarSign } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50">
      <div className="animate-pulse flex flex-col items-center">
        <DollarSign className="h-20 w-20 text-indigo-600" />
        <h1 className="mt-4 text-2xl font-bold text-indigo-700">Dinheiro Rápido</h1>
        <p className="mt-2 text-indigo-600">Carregando sistema...</p>
      </div>
      <div className="mt-8 w-48 h-1 bg-indigo-200 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"></div>
      </div>
    </div>
  );
}