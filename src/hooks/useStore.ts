import { useState, useEffect } from 'react';
import { Space, Project, List, UTMLink } from '../types';

type UndoAction =
  | { type: 'create'; ids: string[]; description: string }
  | { type: 'delete'; links: UTMLink[]; description: string }
  | { type: 'edit'; id: string; prev: Partial<UTMLink>; description: string };

const MAX_UNDO = 1;

export const useStore = (activeProfileId: string | null) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [links, setLinks] = useState<UTMLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const pushUndo = (action: UndoAction) =>
    setUndoStack(prev => [...prev.slice(-MAX_UNDO + 1), action]);

  const fetchData = async () => {
    if (!activeProfileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [spacesRes, projectsRes, listsRes, linksRes] = await Promise.all([
        fetch(`/api/spaces?profileId=${activeProfileId}`).catch(e => { console.error('spaces fetch failed', e); throw e; }),
        fetch('/api/projects').catch(e => { console.error('projects fetch failed', e); throw e; }),
        fetch('/api/lists').catch(e => { console.error('lists fetch failed', e); throw e; }),
        fetch('/api/links').catch(e => { console.error('links fetch failed', e); throw e; })
      ]);
      
      if (spacesRes.ok && projectsRes.ok && listsRes.ok && linksRes.ok) {
        setSpaces(await spacesRes.json());
        setProjects(await projectsRes.json());
        setLists(await listsRes.json());
        setLinks(await linksRes.json());
      } else {
        console.error('Some responses were not ok', {
          spaces: spacesRes.status,
          projects: projectsRes.status,
          lists: listsRes.status,
          links: linksRes.status
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProfileId]);

  // --- SPACES ---
  const addSpace = async (name: string) => {
    if (!activeProfileId) return;
    const newSpace: Space = { id: crypto.randomUUID(), name, order: 0, createdAt: Date.now(), profileId: activeProfileId };
    setSpaces(prev => [newSpace, ...prev]);
    try {
      await fetch('/api/spaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSpace) });
    } catch (error) { console.error('Error adding space:', error); }
    return newSpace;
  };

  const editSpace = async (id: string, name: string) => {
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    try {
      await fetch(`/api/spaces/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    } catch (error) { console.error('Error editing space:', error); }
  };

  const deleteSpace = async (id: string) => {
    setSpaces(prev => prev.filter(s => s.id !== id));
    try {
      await fetch(`/api/spaces/${id}`, { method: 'DELETE' });
    } catch (error) { console.error('Error deleting space:', error); }
  };

  const duplicateSpace = async (id: string) => {
    try {
      await fetch(`/api/duplicate/space/${id}`, { method: 'POST' });
      await fetchData();
    } catch (error) { console.error('Error duplicating space:', error); }
  };

  const reorderSpaces = async (newSpaces: Space[]) => {
    setSpaces(newSpaces);
    try {
      const orders = newSpaces.map((s, i) => ({ id: s.id, order: i }));
      await fetch('/api/spaces/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });
    } catch (error) { console.error('Error reordering spaces:', error); }
  };

  // --- PROJECTS ---
  const addProject = async (spaceId: string, name: string) => {
    const newProject: Project = { id: crypto.randomUUID(), spaceId, name, order: 0, createdAt: Date.now() };
    setProjects(prev => [newProject, ...prev]);
    try {
      await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProject) });
    } catch (error) { console.error('Error adding project:', error); }
    return newProject;
  };

  const editProject = async (id: string, name: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    try {
      await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    } catch (error) { console.error('Error editing project:', error); }
  };

  const moveProject = async (id: string, spaceId: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, spaceId } : p));
    try {
      await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spaceId }) });
    } catch (error) { console.error('Error moving project:', error); }
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    } catch (error) { console.error('Error deleting project:', error); }
  };

  const duplicateProject = async (id: string) => {
    try {
      await fetch(`/api/duplicate/project/${id}`, { method: 'POST' });
      await fetchData();
    } catch (error) { console.error('Error duplicating project:', error); }
  };

  const reorderProjects = async (newProjects: Project[]) => {
    setProjects(newProjects);
    try {
      const orders = newProjects.map((p, i) => ({ id: p.id, order: i, spaceId: p.spaceId }));
      await fetch('/api/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });
    } catch (error) { console.error('Error reordering projects:', error); }
  };

  // --- LISTS ---
  const addList = async (list: Omit<List, 'id' | 'createdAt' | 'order'>) => {
    const newList: List = { ...list, id: crypto.randomUUID(), order: 0, createdAt: Date.now() };
    setLists(prev => [newList, ...prev]);
    try {
      await fetch('/api/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newList) });
    } catch (error) { console.error('Error adding list:', error); }
    return newList;
  };

  const editList = async (id: string, updates: Partial<List>) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    try {
      await fetch(`/api/lists/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    } catch (error) { console.error('Error editing list:', error); }
  };

  const moveList = async (id: string, projectId: string) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, projectId } : l));
    try {
      await fetch(`/api/lists/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId }) });
    } catch (error) { console.error('Error moving list:', error); }
  };

  const deleteList = async (id: string) => {
    setLists(prev => prev.filter(l => l.id !== id));
    try {
      await fetch(`/api/lists/${id}`, { method: 'DELETE' });
    } catch (error) { console.error('Error deleting list:', error); }
  };

  const duplicateList = async (id: string) => {
    try {
      await fetch(`/api/duplicate/list/${id}`, { method: 'POST' });
      await fetchData();
    } catch (error) { console.error('Error duplicating list:', error); }
  };

  const reorderLists = async (newLists: List[]) => {
    setLists(newLists);
    try {
      const orders = newLists.map((l, i) => ({ id: l.id, order: i, projectId: l.projectId }));
      await fetch('/api/lists/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });
    } catch (error) { console.error('Error reordering lists:', error); }
  };

  // --- LINKS (UTMs) ---
  const addLink = async (link: Omit<UTMLink, 'id' | 'createdAt'>) => {
    const newLink: UTMLink = { ...link, id: crypto.randomUUID(), createdAt: Date.now() };
    setLinks(prev => [newLink, ...prev]);
    try {
      const res = await fetch('/api/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLink) });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar el enlace');
      }
      pushUndo({ type: 'create', ids: [newLink.id], description: `Link creado: "${newLink.title}"` });
    } catch (error: any) {
      setLinks(prev => prev.filter(l => l.id !== newLink.id));
      throw error;
    }
    return newLink;
  };

  const addLinks = async (newLinks: Omit<UTMLink, 'id' | 'createdAt'>[]) => {
    const linksToInsert: UTMLink[] = newLinks.map(link => ({ ...link, id: crypto.randomUUID(), createdAt: Date.now() }));
    setLinks(prev => [...linksToInsert, ...prev]);
    try {
      const res = await fetch('/api/links/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(linksToInsert) });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar los enlaces');
      }
      pushUndo({ type: 'create', ids: linksToInsert.map(l => l.id), description: `${linksToInsert.length} links creados` });
    } catch (error: any) {
      const idsToRemove = new Set(linksToInsert.map(l => l.id));
      setLinks(prev => prev.filter(l => !idsToRemove.has(l.id)));
      throw error;
    }
    return linksToInsert;
  };

  const editLink = async (id: string, updates: Partial<UTMLink>) => {
    setLinks(prev => {
      const old = prev.find(l => l.id === id);
      if (old) {
        const prevData: Partial<UTMLink> = {};
        (Object.keys(updates) as (keyof UTMLink)[]).forEach(k => { (prevData as any)[k] = old[k]; });
        pushUndo({ type: 'edit', id, prev: prevData, description: `Link editado: "${old.title}"` });
      }
      return prev.map(l => l.id === id ? { ...l, ...updates } : l);
    });
    try {
      await fetch(`/api/links/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    } catch (error) { console.error('Error editing link:', error); }
  };

  const deleteLink = async (id: string) => {
    setLinks(prev => {
      const link = prev.find(l => l.id === id);
      if (link) pushUndo({ type: 'delete', links: [link], description: `Link eliminado: "${link.title}"` });
      return prev.filter(l => l.id !== id);
    });
    try {
      await fetch(`/api/links/${id}`, { method: 'DELETE' });
    } catch (error) { console.error('Error deleting link:', error); }
  };

  const deleteLinks = async (ids: string[]) => {
    setLinks(prev => {
      const toDelete = prev.filter(l => ids.includes(l.id));
      if (toDelete.length > 0) {
        pushUndo({ type: 'delete', links: toDelete, description: `${toDelete.length} links eliminados` });
      }
      return prev.filter(l => !ids.includes(l.id));
    });
    try {
      await Promise.all(ids.map(id => fetch(`/api/links/${id}`, { method: 'DELETE' })));
    } catch (error) { console.error('Error deleting links:', error); }
  };

  const undo = async () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    setUndoStack(prev => prev.slice(0, -1));

    if (action.type === 'create') {
      setLinks(prev => prev.filter(l => !action.ids.includes(l.id)));
      await Promise.all(action.ids.map(id => fetch(`/api/links/${id}`, { method: 'DELETE' })));
    } else if (action.type === 'delete') {
      setLinks(prev => [...action.links, ...prev]);
      await fetch('/api/links/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.links)
      });
    } else if (action.type === 'edit') {
      setLinks(prev => prev.map(l => l.id === action.id ? { ...l, ...action.prev } : l));
      await fetch(`/api/links/${action.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.prev)
      });
    }
  };

  return {
    spaces, projects, lists, links, loading,
    addSpace, editSpace, deleteSpace, duplicateSpace, reorderSpaces,
    addProject, editProject, deleteProject, duplicateProject, moveProject, reorderProjects,
    addList, editList, deleteList, duplicateList, moveList, reorderLists,
    addLink, addLinks, editLink, deleteLink, deleteLinks,
    undo, canUndo: undoStack.length > 0,
  };
};
