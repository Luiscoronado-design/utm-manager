import React from 'react';
import { Users } from 'lucide-react';

interface ProfileSelectorProps {
  onSelect: (profile: string) => void;
}

export default function ProfileSelector({ onSelect }: ProfileSelectorProps) {
  const profiles = [
    { id: 'marketing', name: 'Marketing', color: 'bg-pink-100 text-pink-600' },
    { id: 'ventas', name: 'Ventas', color: 'bg-blue-100 text-blue-600' },
  ];

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 font-sans">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
            <Users className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-2">
          Selecciona un Perfil
        </h2>
        <p className="text-center text-gray-500 mb-8">
          Elige el área de trabajo para continuar.
        </p>

        <div className="space-y-4">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full flex items-center p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-sm transition-all text-left bg-white"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${p.color}`}>
                <span className="font-bold text-lg">{p.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-500">Espacio de trabajo de {p.name.toLowerCase()}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
