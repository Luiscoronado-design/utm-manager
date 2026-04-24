import React, { useState, useEffect } from 'react';
import { Users, Plus, Lock, Settings, Trash2, Edit2, X } from 'lucide-react';
import { Profile } from '../types';

interface ProfileSelectionProps {
  onSelectProfile: (profileId: string) => void;
}

export default function ProfileSelection({ onSelectProfile }: ProfileSelectionProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  
  // Selected profile for actions
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  
  // Form states
  const [password, setPassword] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePassword, setNewProfilePassword] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSelectClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setPassword('');
    setError('');
    setShowPasswordModal(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    
    setActionLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/profiles/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedProfile.id, password })
      });
      
      if (res.ok) {
        localStorage.setItem('active_profile_id', selectedProfile.id);
        onSelectProfile(selectedProfile.id);
      } else {
        setError('Contraseña incorrecta');
      }
    } catch (err) {
      setError('Error al verificar la contraseña');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    
    try {
      const newProfile = {
        id: crypto.randomUUID(),
        name: newProfileName,
        password: newProfilePassword,
        createdAt: Date.now()
      };
      
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });
      
      if (res.ok) {
        setShowCreateModal(false);
        setNewProfileName('');
        setNewProfilePassword('');
        fetchProfiles();
      } else {
        setError('Error al crear el perfil');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este perfil? Se perderán todos sus espacios.')) return;
    
    try {
      await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      fetchProfiles();
    } catch (err) {
      console.error('Error deleting profile:', err);
    }
  };

  const handleEditProfileName = async (id: string, currentName: string) => {
    const newName = prompt('Nuevo nombre del perfil:', currentName);
    if (!newName || newName === currentName) return;
    
    try {
      await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      fetchProfiles();
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleChangePassword = async (id: string) => {
    const newPass = prompt('Nueva contraseña:');
    if (!newPass) return;
    
    try {
      await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass })
      });
      alert('Contraseña actualizada correctamente');
    } catch (err) {
      console.error('Error updating password:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 font-sans p-4">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Selecciona tu Perfil</h1>
            <p className="text-gray-500 mt-2">Elige un espacio de trabajo para continuar</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowManageModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Administrar
            </button>
            <button
              onClick={() => {
                setNewProfileName('');
                setNewProfilePassword('');
                setError('');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Perfil
            </button>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900">No hay perfiles</h3>
            <p className="text-gray-500 mt-2 mb-6">Crea tu primer perfil para empezar a usar la aplicación.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              Crear Perfil
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => handleSelectClick(profile)}
                className="flex flex-col items-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group text-left w-full relative overflow-hidden"
              >
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl font-bold">{profile.name.charAt(0).toUpperCase()}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 w-full text-center truncate">{profile.name}</h3>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && selectedProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Ingresar a {selectedProfile.name}</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                  required
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Crear Nuevo Perfil</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Perfil</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={newProfilePassword}
                  onChange={e => setNewProfilePassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading ? 'Creando...' : 'Crear Perfil'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Profiles Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Administrar Perfiles</h3>
              <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {profiles.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{profile.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditProfileName(profile.id, profile.name)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Cambiar nombre"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleChangePassword(profile.id)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Cambiar contraseña"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar perfil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {profiles.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay perfiles creados.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
