import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  to?: string;
  color?: 'primary' | 'success' | 'warning' | 'info' | 'secondary';
  secondaryText?: string;
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  to, 
  color = 'primary',
  secondaryText
}: StatCardProps) {
  const colorClasses = {
    icon: {
      primary: 'bg-indigo-100 text-indigo-600',
      success: 'bg-emerald-100 text-emerald-600',
      warning: 'bg-amber-100 text-amber-600',
      info: 'bg-blue-100 text-blue-600',
      secondary: 'bg-purple-100 text-purple-600',
    },
    text: {
      primary: 'text-indigo-600',
      success: 'text-emerald-600',
      warning: 'text-amber-600',
      info: 'text-blue-600',
      secondary: 'text-purple-600',
    }
  };

  const card = (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-sm font-medium text-gray-500">{title}</h2>
          <div className="mt-1 flex items-baseline">
            <p className={`text-2xl font-semibold ${colorClasses.text[color]}`}>
              {value}
            </p>
          </div>
          {secondaryText && (
            <p className="text-sm text-gray-500 mt-1">{secondaryText}</p>
          )}
        </div>
        <div className={`p-3 rounded-md ${colorClasses.icon[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {card}
    </Link>
  ) : card;
}