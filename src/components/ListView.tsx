import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Space, Project, List, UTMLink } from '../types';
import LinkModal from './LinkModal';
import { buildUTMLink } from '../utils/utm';
import { Search, ExternalLink, Copy, Trash2, CheckCircle2, Plus, Edit2, CheckSquare, Square, CopyPlus, ArrowUp, ArrowDown, FileDown } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface ListViewProps {
  space: Space;
  project: Project;
  list: List;
  links: UTMLink[];
  onAddLink: (link: Omit<UTMLink, 'id' | 'createdAt'>) => Promise<any>;
  onAddLinks: (links: Omit<UTMLink, 'id' | 'createdAt'>[]) => Promise<any>;
  onEditLink: (id: string, updates: Partial<UTMLink>) => void;
  onDeleteLink: (id: string) => void;
  onEditList: (id: string, updates: Partial<List>) => void;
}

export default function ListView({ space, project, list, links, onAddLink, onAddLinks, onEditLink, onDeleteLink, onEditList }: ListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingBaseUrl, setIsEditingBaseUrl] = useState(false);
  const [tempBaseUrl, setTempBaseUrl] = useState(list.baseUrl);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'bulk';
    initialData?: UTMLink;
  }>({ isOpen: false, mode: 'create' });
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shortCopiedId, setShortCopiedId] = useState<string | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [deleteState, setDeleteState] = useState<{type: 'single' | 'bulk', id?: string} | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'title'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredLinks = useMemo(() => {
    let result = links;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = links.filter(link => 
        link.title.toLowerCase().includes(query) ||
        link.utmCampaign.toLowerCase().includes(query) ||
        link.utmSource.toLowerCase().includes(query) ||
        link.utmMedium.toLowerCase().includes(query) ||
        link.baseUrl.toLowerCase().includes(query)
      );
    }
    
    return [...result].sort((a, b) => {
      if (sortBy === 'createdAt') {
        return sortOrder === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
      } else {
        return sortOrder === 'asc' 
          ? a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }) 
          : b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: 'base' });
      }
    });
  }, [links, searchQuery, sortBy, sortOrder]);

  const handleSort = (field: 'createdAt' | 'title') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const handleCopy = (id: string, url: string, isShort: boolean = false) => {
    navigator.clipboard.writeText(url);
    if (isShort) {
      setShortCopiedId(id);
      setTimeout(() => setShortCopiedId(null), 2000);
    } else {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLinks.size === filteredLinks.length && filteredLinks.length > 0) {
      setSelectedLinks(new Set());
    } else {
      setSelectedLinks(new Set(filteredLinks.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedLinks);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLinks(newSet);
  };

  const handleSave = async (data: Partial<UTMLink> | Partial<UTMLink>[]) => {
    if (modalState.mode === 'create') {
      if (Array.isArray(data)) {
        await onAddLinks(data.map(d => ({
          listId: list.id,
          title: d.title!,
          baseUrl: d.baseUrl!,
          utmSource: d.utmSource!,
          utmMedium: d.utmMedium!,
          utmCampaign: d.utmCampaign!,
          utmContent: d.utmContent || '',
          utmTerm: d.utmTerm || '',
          shortUrl: d.shortUrl || '',
          finalUrl: d.finalUrl!
        })));
      } else {
        await onAddLink({
          listId: list.id,
          title: data.title!,
          baseUrl: data.baseUrl!,
          utmSource: data.utmSource!,
          utmMedium: data.utmMedium!,
          utmCampaign: data.utmCampaign!,
          utmContent: data.utmContent || '',
          utmTerm: data.utmTerm || '',
          shortUrl: data.shortUrl || '',
          finalUrl: data.finalUrl!
        });
      }
    } else if (modalState.mode === 'edit' && modalState.initialData) {
      if (!Array.isArray(data)) {
        onEditLink(modalState.initialData.id, data);
      }
    } else if (modalState.mode === 'bulk') {
      const ids = filteredLinks.filter(l => selectedLinks.has(l.id)).map(l => l.id);
      if (Array.isArray(data)) {
        ids.forEach((id: string, index: number) => {
          const link = links.find(l => l.id === id);
          const updates = data[index];
          if (link && updates) {
            const updatedLink = { ...link, ...updates };
            const finalUrl = buildUTMLink(
              updatedLink.baseUrl || '',
              updatedLink.utmSource || '',
              updatedLink.utmMedium || '',
              updatedLink.utmCampaign || '',
              updatedLink.utmContent || '',
              updatedLink.utmTerm || ''
            );
            onEditLink(id, { ...updates, finalUrl });
          }
        });
      } else {
        ids.forEach((id: string) => {
          const link = links.find(l => l.id === id);
          if (link) {
            const updatedLink = { ...link, ...data };
            const finalUrl = buildUTMLink(
              updatedLink.baseUrl || '',
              updatedLink.utmSource || '',
              updatedLink.utmMedium || '',
              updatedLink.utmCampaign || '',
              updatedLink.utmContent || '',
              updatedLink.utmTerm || ''
            );
            onEditLink(id, { ...data, finalUrl });
          }
        });
      }
      setSelectedLinks(new Set());
    }
  };

  const handleBulkDelete = () => {
    setDeleteState({type: 'bulk'});
  };

  const handleBaseUrlSubmit = () => {
    if (tempBaseUrl.trim() && tempBaseUrl !== list.baseUrl) {
      onEditList(list.id, { baseUrl: tempBaseUrl.trim() });
    }
    setIsEditingBaseUrl(false);
  };

  const handleBaseUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBaseUrlSubmit();
    if (e.key === 'Escape') {
      setTempBaseUrl(list.baseUrl);
      setIsEditingBaseUrl(false);
    }
  };

  const getShortSlug = (shortUrl: string): string => {
    if (!shortUrl) return '';
    try {
      const url = new URL(shortUrl);
      // Remove leading slash and return just the path slug
      return url.pathname.replace(/^\//, '');
    } catch {
      // Not a valid URL, return as-is or extract after last "/"
      return shortUrl.split('/').pop() || shortUrl;
    }
  };

  const handleExportExcel = () => {
    const linksToExport = (selectedLinks.size > 0
      ? filteredLinks.filter(l => selectedLinks.has(l.id))
      : filteredLinks
    ).filter(l => l.shortUrl && l.shortUrl.trim() !== '');

    const rows = linksToExport.map(link => ({
      'Título': link.title,
      'Link UTM': link.finalUrl,
      'Link Acortado (slug)': link.shortUrl ? getShortSlug(link.shortUrl) : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-width columns
    const colWidths = [
      { wch: 30 },  // Título
      { wch: 80 },  // Link UTM
      { wch: 50 },  // Link Acortado
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, list.name.slice(0, 31));

    const fileName = `${list.name.replace(/[^a-z0-9_\-]/gi, '_')}_links.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>{space.name}</span>
              <span>/</span>
              <span>{project.name}</span>
              <span>/</span>
              <span className="font-medium text-gray-900">{list.name}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{list.name}</h2>
            {list.description && <p className="text-gray-500 mt-1">{list.description}</p>}
            <div className="mt-3 flex items-start gap-1.5 text-sm text-gray-500">
              <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
              {isEditingBaseUrl ? (
                <input
                  type="text"
                  value={tempBaseUrl}
                  onChange={(e) => setTempBaseUrl(e.target.value)}
                  onBlur={handleBaseUrlSubmit}
                  onKeyDown={handleBaseUrlKeyDown}
                  autoFocus
                  className="px-2 py-0.5 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 w-full max-w-md"
                />
              ) : (
                <div className="flex items-start gap-2 max-w-2xl">
                  <div 
                    onClick={() => {
                      setTempBaseUrl(list.baseUrl);
                      setIsEditingBaseUrl(true);
                    }}
                    className="group flex items-start gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    <span className="hover:underline break-all" style={{ overflowWrap: 'anywhere' }}>{list.baseUrl}</span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCopy('base', list.baseUrl); }}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors shrink-0 mt-0.5"
                    title="Copiar link base"
                  >
                    {copiedId === 'base' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => setModalState({ isOpen: true, mode: 'create' })}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Crear nuevo link
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/50 rounded-t-xl">
            {selectedLinks.size > 0 ? (
              <div className="flex items-center gap-4 w-full">
                <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
                  {selectedLinks.size} seleccionados
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setModalState({ isOpen: true, mode: 'bulk' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edición Masiva
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-gray-300 hover:bg-red-50 rounded-md transition-colors shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-white border border-gray-300 hover:bg-green-50 rounded-md transition-colors shadow-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Descargar Excel
                  </button>
                </div>
                <div className="flex-1"></div>
                <button 
                  onClick={() => setSelectedLinks(new Set())}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancelar selección
                </button>
              </div>
            ) : (
              <>
                <div className="relative w-full max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar links por título, campaña, source..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full bg-white shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-medium">
                    {filteredLinks.length} {filteredLinks.length === 1 ? 'link' : 'links'}
                  </span>
                  {filteredLinks.length > 0 && (
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-white border border-gray-300 hover:bg-green-50 rounded-md transition-colors shadow-sm"
                      title="Descargar todos los links como Excel"
                    >
                      <FileDown className="w-4 h-4" />
                      Excel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {filteredLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <p className="text-lg font-medium text-gray-900 mb-1">No hay links encontrados</p>
                <p className="text-sm">Crea un nuevo link o cambia tu búsqueda.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600">
                        {selectedLinks.size === filteredLinks.length && filteredLinks.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <button 
                        onClick={() => handleSort('title')}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                      >
                        Link
                        {sortBy === 'title' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <button 
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                      >
                        Fecha / UTM Tags
                        {sortBy === 'createdAt' && (
                          sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLinks.map(link => {
                    const isSelected = selectedLinks.has(link.id);
                    return (
                      <tr key={link.id} className={`transition-colors group ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => toggleSelect(link.id)} className="text-gray-400 hover:text-indigo-600">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">{link.title}</div>
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="text-gray-500 text-xs truncate max-w-xs font-mono flex items-center gap-1.5" title={link.finalUrl}>
                              <span className="shrink-0 text-[10px] font-bold text-gray-400 uppercase">UTM:</span>
                              <span className="truncate">{link.finalUrl}</span>
                            </div>
                            {link.shortUrl && (
                              <div className="text-indigo-600 text-xs truncate max-w-xs font-mono flex items-center gap-1.5" title={link.shortUrl}>
                                <span className="shrink-0 text-[10px] font-bold text-indigo-400 uppercase">Short:</span>
                                <span className="truncate">{link.shortUrl}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCopy(link.id, link.shortUrl!, true); }}
                                  className="p-0.5 hover:bg-indigo-100 rounded transition-colors"
                                  title="Copiar link acortado"
                                >
                                  {shortCopiedId === link.id ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs text-gray-500 mb-2">
                            Creado el: {new Date(link.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100" title="Campaign">
                              cmp: {link.utmCampaign}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-200" title="Source">
                              src: {link.utmSource}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-200" title="Medium">
                              med: {link.utmMedium}
                            </span>
                            {link.utmContent && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-200" title="Content">
                                cnt: {link.utmContent}
                              </span>
                            )}
                            {link.utmTerm && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium border border-gray-200" title="Placement">
                                plc: {link.utmTerm}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => handleCopy(link.id, link.finalUrl)} 
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Copiar link"
                            >
                              {copiedId === link.id ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => setModalState({ isOpen: true, mode: 'create', initialData: link })} 
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              title="Duplicar link"
                            >
                              <CopyPlus className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setModalState({ isOpen: true, mode: 'edit', initialData: link })} 
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              title="Editar link"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeleteState({type: 'single', id: link.id})} 
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              title="Eliminar link"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <LinkModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
        space={space}
        project={project}
        list={list}
        mode={modalState.mode}
        initialData={modalState.initialData}
        selectedCount={selectedLinks.size}
        onSave={handleSave}
      />

      <ConfirmModal 
        isOpen={!!deleteState} 
        title={deleteState?.type === 'bulk' ? "Eliminar Enlaces" : "Eliminar Enlace"} 
        message={deleteState?.type === 'bulk' ? `¿Estás seguro de que deseas eliminar los ${selectedLinks.size} enlaces seleccionados?` : "¿Estás seguro de que deseas eliminar este enlace?"} 
        onConfirm={() => {
          if (deleteState?.type === 'bulk') {
            Array.from(selectedLinks).forEach((id: string) => onDeleteLink(id));
            setSelectedLinks(new Set());
          } else if (deleteState?.id) {
            onDeleteLink(deleteState.id);
          }
          setDeleteState(null);
        }} 
        onCancel={() => setDeleteState(null)} 
      />
    </div>
  );
}
