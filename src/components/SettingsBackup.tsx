import { useState, useRef } from 'react';
import { Save, Upload, Settings as Gear } from 'lucide-react';

interface SettingsBackupProps {
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SettingsBackup({ onExport, onImport }: SettingsBackupProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        <button
          className="bg-white border border-gray-300 rounded-full p-2 shadow hover:bg-gray-100 transition"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir configurações de backup"
        >
          <Gear size={24} />
        </button>
        {open && (
          <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex flex-col gap-2 min-w-[180px]">
            <button onClick={onExport} className="btn btn-secondary flex items-center gap-2 w-full">
              <Save size={18} /> Exportar Backup
            </button>
            <label className="btn btn-secondary flex items-center gap-2 cursor-pointer w-full">
              <Upload size={18} /> Importar Backup
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={onImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
