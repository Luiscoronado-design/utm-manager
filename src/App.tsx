import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from './hooks/useStore';
import Sidebar from './components/Sidebar';
import ListView from './components/ListView';
import ProfileSelection from './components/ProfileSelection';
import { LayoutTemplate, Users, RotateCcw } from 'lucide-react';
import { Profile } from './types';

export default function App() {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  useEffect(() => {
    const checkSession = async () => {
      const storedProfileId = localStorage.getItem('active_profile_id');
      if (storedProfileId) {
        try {
          const res = await fetch('/api/profiles');
          if (res.ok) {
            const profiles: Profile[] = await res.json();
            const profile = profiles.find(p => p.id === storedProfileId);
            if (profile) {
              setActiveProfile(profile);
              setActiveProfileId(storedProfileId);
            } else {
              // Profile was deleted or not found
              localStorage.removeItem('active_profile_id');
            }
          }
        } catch (e) {
          console.error('Failed to fetch profiles for session check', e);
        }
      }
      setAuthChecked(true);
    };
    
    checkSession();
  }, []);

  const {
    spaces, projects, lists, links, loading,
    addSpace, editSpace, deleteSpace, duplicateSpace, reorderSpaces,
    addProject, editProject, deleteProject, duplicateProject, moveProject, reorderProjects,
    addList, editList, deleteList, duplicateList, moveList, reorderLists,
    addLink, addLinks, editLink, deleteLink, deleteLinks,
    undo, canUndo, lastUndoDescription,
  } = useStore(activeProfileId);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Ctrl+Z global shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      const active = document.activeElement as HTMLElement;
      const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
      if (!isInput && canUndo) {
        e.preventDefault();
        undo();
      }
    }
  }, [canUndo, undo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!activeProfileId) {
    return (
      <ProfileSelection 
        onSelectProfile={async (profileId) => {
          setActiveProfileId(profileId);
          // Fetch profile details to show in header
          try {
            const res = await fetch('/api/profiles');
            if (res.ok) {
              const profiles: Profile[] = await res.json();
              const profile = profiles.find(p => p.id === profileId);
              if (profile) setActiveProfile(profile);
            }
          } catch (e) {
            console.error('Failed to fetch profile details', e);
          }
        }} 
      />
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('active_profile_id');
    setActiveProfileId(null);
    setActiveProfile(null);
    setSelectedListId(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center text-gray-500">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  const selectedList = lists.find(l => l.id === selectedListId);
  const selectedProject = selectedList ? projects.find(p => p.id === selectedList.projectId) : null;
  const selectedSpace = selectedProject ? spaces.find(s => s.id === selectedProject.spaceId) : null;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar 
        spaces={spaces}
        projects={projects} 
        lists={lists}
        selectedListId={selectedListId} 
        onSelectList={setSelectedListId}
        onAddSpace={addSpace}
        onEditSpace={editSpace}
        onDeleteSpace={(id) => {
          deleteSpace(id);
          if (selectedSpace?.id === id) setSelectedListId(null);
        }}
        onDuplicateSpace={duplicateSpace}
        onReorderSpaces={reorderSpaces}
        onAddProject={addProject}
        onEditProject={editProject}
        onDeleteProject={(id) => {
          deleteProject(id);
          if (selectedProject?.id === id) setSelectedListId(null);
        }}
        onDuplicateProject={duplicateProject}
        onMoveProject={moveProject}
        onReorderProjects={reorderProjects}
        onAddList={(projectId, name) => addList({ projectId, name, baseUrl: '', description: '' })}
        onEditList={(id, name) => editList(id, { name })}
        onDeleteList={(id) => {
          deleteList(id);
          if (selectedListId === id) setSelectedListId(null);
        }}
        onDuplicateList={duplicateList}
        onMoveList={moveList}
        onReorderLists={reorderLists}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="w-5 h-5 text-indigo-600" />
            <span className="font-medium">{activeProfile?.name || 'Perfil Activo'}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors"
          >
            Cambiar Perfil
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {selectedList && selectedProject && selectedSpace ? (
            <ListView
              space={selectedSpace}
              project={selectedProject}
              list={selectedList}
              links={links.filter(l => l.listId === selectedList.id)}
              onAddLink={addLink}
              onAddLinks={addLinks}
              onEditLink={editLink}
              onDeleteLink={deleteLink}
              onDeleteLinks={deleteLinks}
              onEditList={editList}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <LayoutTemplate className="w-16 h-16 mb-4 text-gray-300" />
              <h2 className="text-xl font-medium text-gray-700">Selecciona una lista</h2>
              <p className="mt-2 text-center max-w-md text-gray-400">
                Navega a través de los espacios y proyectos en la barra lateral para seleccionar una lista operativa y gestionar tus UTMs.
              </p>
            </div>
          )}
        </div>
      </main>
      {/* Undo floating bar */}
      {canUndo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm animate-fade-in">
          <RotateCcw className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-gray-300 max-w-xs truncate">{lastUndoDescription}</span>
          <button
            onClick={undo}
            className="ml-1 px-3 py-1 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-lg transition-colors"
          >
            Deshacer
          </button>
          <span className="text-gray-500 text-xs hidden sm:inline">Ctrl+Z</span>
        </div>
      )}
    </div>
  );
}
