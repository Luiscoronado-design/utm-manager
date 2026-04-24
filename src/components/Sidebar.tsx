import React, { useState } from 'react';
import { Space, Project, List } from '../types';
import { 
  Plus, Edit2, Trash2, X, Check, ChevronRight, ChevronDown, 
  LayoutGrid, Folder, List as ListIcon, Copy, Move, MoreVertical, GripVertical 
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarProps {
  spaces: Space[];
  projects: Project[];
  lists: List[];
  selectedListId: string | null;
  onSelectList: (id: string) => void;
  onAddSpace: (name: string) => void;
  onEditSpace: (id: string, name: string) => void;
  onDeleteSpace: (id: string) => void;
  onDuplicateSpace: (id: string) => void;
  onReorderSpaces: (newSpaces: Space[]) => void;
  onAddProject: (spaceId: string, name: string) => void;
  onEditProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onMoveProject: (id: string, spaceId: string) => void;
  onReorderProjects: (newProjects: Project[]) => void;
  onAddList: (projectId: string, name: string) => void;
  onEditList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
  onDuplicateList: (id: string) => void;
  onMoveList: (id: string, projectId: string) => void;
  onReorderLists: (newLists: List[]) => void;
}

interface SortableItemProps {
  id: string;
  type: 'space' | 'project' | 'list';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function SortableItem({ id, type, children, className, onClick }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { type } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className={`${className} relative group flex items-center`}>
      <div 
        {...attributes} 
        {...listeners} 
        className="opacity-0 group-hover:opacity-100 p-1 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 transition-opacity"
      >
        <GripVertical className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0" onClick={onClick}>
        {children}
      </div>
    </div>
  );
}

export default function Sidebar({
  spaces, projects, lists, selectedListId, onSelectList,
  onAddSpace, onEditSpace, onDeleteSpace, onDuplicateSpace, onReorderSpaces,
  onAddProject, onEditProject, onDeleteProject, onDuplicateProject, onMoveProject, onReorderProjects,
  onAddList, onEditList, onDeleteList, onDuplicateList, onMoveList, onReorderLists
}: SidebarProps) {
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isAddingSpace, setIsAddingSpace] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  const [deleteState, setDeleteState] = useState<{type: 'space' | 'project' | 'list', id: string} | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSpace = (id: string) => {
    const newSet = new Set(expandedSpaces);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSpaces(newSet);
  };

  const toggleProject = (id: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedProjects(newSet);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (active.id !== over.id) {
      if (activeType === 'space' && overType === 'space') {
        const oldIndex = spaces.findIndex(s => s.id === active.id);
        const newIndex = spaces.findIndex(s => s.id === over.id);
        onReorderSpaces(arrayMove(spaces, oldIndex, newIndex));
      } else if (activeType === 'project') {
        const activeProject = projects.find(p => p.id === active.id);
        if (!activeProject) return;

        let newProjects = [...projects];
        const activeIndex = newProjects.findIndex(p => p.id === active.id);

        if (overType === 'project') {
          const overProject = projects.find(p => p.id === over.id);
          if (!overProject) return;

          // Update spaceId if moved to a different space
          if (activeProject.spaceId !== overProject.spaceId) {
            newProjects[activeIndex] = { ...activeProject, spaceId: overProject.spaceId };
          }
          
          const overIndex = newProjects.findIndex(p => p.id === over.id);
          onReorderProjects(arrayMove(newProjects, activeIndex, overIndex));
        } else if (overType === 'space') {
          // Move project to a space (at the end of that space)
          newProjects[activeIndex] = { ...activeProject, spaceId: over.id as string };
          // To put it at the end, we can find the last project in that space
          const lastInSpaceIndex = newProjects.map(p => p.spaceId === over.id).lastIndexOf(true);
          
          if (lastInSpaceIndex !== -1) {
            onReorderProjects(arrayMove(newProjects, activeIndex, lastInSpaceIndex));
          } else {
            onReorderProjects(newProjects);
          }
        }
      } else if (activeType === 'list') {
        const activeList = lists.find(l => l.id === active.id);
        if (!activeList) return;

        let newLists = [...lists];
        const activeIndex = newLists.findIndex(l => l.id === active.id);

        if (overType === 'list') {
          const overList = lists.find(l => l.id === over.id);
          if (!overList) return;

          if (activeList.projectId !== overList.projectId) {
            newLists[activeIndex] = { ...activeList, projectId: overList.projectId };
          }
          
          const overIndex = newLists.findIndex(l => l.id === over.id);
          onReorderLists(arrayMove(newLists, activeIndex, overIndex));
        } else if (overType === 'project') {
          newLists[activeIndex] = { ...activeList, projectId: over.id as string };
          const lastInProjectIndex = newLists.map(l => l.projectId === over.id).lastIndexOf(true);
          
          if (lastInProjectIndex !== -1) {
            onReorderLists(arrayMove(newLists, activeIndex, lastInProjectIndex));
          } else {
            onReorderLists(newLists);
          }
        }
      }
    }
  };

  const handleAddSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSpaceName.trim()) {
      onAddSpace(newSpaceName.trim());
      setNewSpaceName('');
      setIsAddingSpace(false);
    }
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = (type: 'space' | 'project' | 'list', id: string) => {
    if (editName.trim()) {
      if (type === 'space') onEditSpace(id, editName.trim());
      else if (type === 'project') onEditProject(id, editName.trim());
      else if (type === 'list') onEditList(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-80 bg-gray-900 text-gray-300 flex flex-col h-full border-r border-gray-800">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2 text-white mb-6">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">UTM Manager</h1>
        </div>
        
        <button 
          onClick={() => setIsAddingSpace(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nuevo Espacio
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {isAddingSpace && (
          <form onSubmit={handleAddSpace} className="mb-4 px-3">
            <input
              autoFocus
              type="text"
              placeholder="Nombre del espacio..."
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              onBlur={() => !newSpaceName && setIsAddingSpace(false)}
              className="w-full bg-gray-800 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
            />
          </form>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={spaces.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {spaces.map(space => (
                <li key={space.id} className="space-y-1">
                  <SortableItem id={space.id} type="space">
                    <div className="group flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => toggleSpace(space.id)}>
                        {expandedSpaces.has(space.id) ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                        <LayoutGrid className="w-4 h-4 text-indigo-400 shrink-0" />
                        {editingId === space.id ? (
                          <input
                            autoFocus
                            className="bg-transparent border-b border-indigo-500 outline-none w-full text-sm text-white"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit('space', space.id)}
                            onBlur={() => saveEdit('space', space.id)}
                          />
                        ) : (
                          <span className="text-sm font-medium truncate" title={space.name}>{space.name}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onAddProject(space.id, 'Nuevo Proyecto'); }} className="p-1 hover:text-white" title="Nuevo Proyecto"><Plus className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(space.id, space.name); }} className="p-1 hover:text-white" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDuplicateSpace(space.id); }} className="p-1 hover:text-white" title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteState({type: 'space', id: space.id}); }} className="p-1 hover:text-red-400" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </SortableItem>

                  {expandedSpaces.has(space.id) && (
                    <SortableContext items={projects.filter(p => p.spaceId === space.id).map(p => p.id)} strategy={verticalListSortingStrategy}>
                      <ul className="ml-4 space-y-1 border-l border-gray-800 pl-1">
                        {projects.filter(p => p.spaceId === space.id).map(project => (
                          <li key={project.id} className="space-y-1">
                            <SortableItem id={project.id} type="project">
                              <div className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                                <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => toggleProject(project.id)}>
                                  {expandedProjects.has(project.id) ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  {editingId === project.id ? (
                                    <input
                                      autoFocus
                                      className="bg-transparent border-b border-indigo-500 outline-none w-full text-sm text-white"
                                      value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && saveEdit('project', project.id)}
                                      onBlur={() => saveEdit('project', project.id)}
                                    />
                                  ) : (
                                    <span className="text-sm truncate" title={project.name}>{project.name}</span>
                                  )}
                                </div>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); onAddList(project.id, 'Nueva Lista'); }} className="p-1 hover:text-white" title="Nueva Lista"><Plus className="w-3 h-3" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleEdit(project.id, project.name); }} className="p-1 hover:text-white" title="Editar"><Edit2 className="w-3 h-3" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); onDuplicateProject(project.id); }} className="p-1 hover:text-white" title="Duplicar"><Copy className="w-3 h-3" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteState({type: 'project', id: project.id}); }} className="p-1 hover:text-red-400" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                            </SortableItem>

                            {expandedProjects.has(project.id) && (
                              <SortableContext items={lists.filter(l => l.projectId === project.id).map(l => l.id)} strategy={verticalListSortingStrategy}>
                                <ul className="ml-4 space-y-1 border-l border-gray-800 pl-1">
                                  {lists.filter(l => l.projectId === project.id).map(list => (
                                    <li key={list.id}>
                                      <SortableItem id={list.id} type="list" onClick={() => onSelectList(list.id)}>
                                        <div 
                                          className={`group flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${selectedListId === list.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'}`}
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <ListIcon className={`w-3.5 h-3.5 shrink-0 ${selectedListId === list.id ? 'text-white' : 'text-emerald-400'}`} />
                                            {editingId === list.id ? (
                                              <input
                                                autoFocus
                                                className="bg-transparent border-b border-white outline-none w-full text-sm text-white"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && saveEdit('list', list.id)}
                                                onBlur={() => saveEdit('list', list.id)}
                                              />
                                            ) : (
                                              <span className="text-sm truncate" title={list.name}>{list.name}</span>
                                            )}
                                          </div>
                                          <div className={`flex items-center opacity-0 group-hover:opacity-100 transition-opacity ${selectedListId === list.id ? 'text-white' : 'text-gray-400'}`}>
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(list.id, list.name); }} className="p-1 hover:text-white" title="Editar"><Edit2 className="w-3 h-3" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); onDuplicateList(list.id); }} className="p-1 hover:text-white" title="Duplicar"><Copy className="w-3 h-3" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteState({type: 'list', id: list.id}); }} className="p-1 hover:text-red-400" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                                          </div>
                                        </div>
                                      </SortableItem>
                                    </li>
                                  ))}
                                </ul>
                              </SortableContext>
                            )}
                          </li>
                        ))}
                      </ul>
                    </SortableContext>
                  )}
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      <ConfirmModal 
        isOpen={!!deleteState} 
        title={`Eliminar ${deleteState?.type === 'space' ? 'Espacio' : deleteState?.type === 'project' ? 'Proyecto' : 'Lista'}`} 
        message="¿Estás seguro? Esta acción eliminará todo el contenido relacionado y no se puede deshacer." 
        onConfirm={() => {
          if (deleteState?.type === 'space') onDeleteSpace(deleteState.id);
          else if (deleteState?.type === 'project') onDeleteProject(deleteState.id);
          else if (deleteState?.type === 'list') onDeleteList(deleteState.id);
          setDeleteState(null);
        }} 
        onCancel={() => setDeleteState(null)} 
      />
    </div>
  );
}
