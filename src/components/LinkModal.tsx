import React, { useState, useEffect } from 'react';
import { Space, Project, List, UTMLink } from '../types';
import { buildUTMLink, normalizeUTMValue, fixUrl, validateUrl } from '../utils/utm';
import { X, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space;
  project: Project;
  list: List;
  mode: 'create' | 'edit' | 'bulk';
  initialData?: UTMLink;
  selectedCount?: number;
  onSave: (data: Partial<UTMLink> | Partial<UTMLink>[]) => Promise<any> | void;
}

export default function LinkModal({ isOpen, onClose, space, project, list, mode, initialData, selectedCount, onSave }: LinkModalProps) {
  const [title, setTitle] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const [term, setTerm] = useState('');
  const [shortUrl, setShortUrl] = useState('');

  const [isIncremental, setIsIncremental] = useState(false);
  const [incrementStart, setIncrementStart] = useState(1);
  const [incrementEnd, setIncrementEnd] = useState(5);
  const [incrementFields, setIncrementFields] = useState({
    title: false,
    source: false,
    medium: false,
    campaign: false,
    content: false,
    term: false,
    shortUrl: false,
  });

  const [updateFields, setUpdateFields] = useState({
    title: false,
    baseUrl: false,
    source: false,
    medium: false,
    campaign: false,
    content: false,
    term: false,
    shortUrl: false,
  });

  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if ((mode === 'edit' || mode === 'create') && initialData) {
        setTitle(initialData.title);
        setBaseUrl(initialData.baseUrl);
        setSource(initialData.utmSource);
        setMedium(initialData.utmMedium);
        setCampaign(initialData.utmCampaign);
        setContent(initialData.utmContent || '');
        setTerm(initialData.utmTerm || '');
        setShortUrl(initialData.shortUrl || '');
        if (mode === 'create') {
          setIsIncremental(false);
          setIncrementStart(1);
          setIncrementEnd(5);
          setIncrementFields({ title: false, source: false, medium: false, campaign: false, content: false, term: false, shortUrl: false });
        }
      } else if (mode === 'create') {
        setTitle('');
        // If list.baseUrl is just 'https://', treat it as empty so the placeholder shows
        setBaseUrl(list.baseUrl === 'https://' ? '' : list.baseUrl);
        setSource('');
        setMedium('');
        setCampaign('');
        setContent('');
        setTerm('');
        setShortUrl('');
        setIsIncremental(false);
        setIncrementStart(1);
        setIncrementEnd(5);
        setIncrementFields({ title: false, source: false, medium: false, campaign: false, content: false, term: false, shortUrl: false });
      } else if (mode === 'bulk') {
        setTitle('');
        setBaseUrl('');
        setSource('');
        setMedium('');
        setCampaign('');
        setContent('');
        setTerm('');
        setShortUrl('');
        setIsIncremental(false);
        setIncrementStart(1);
        setIncrementFields({ title: false, source: false, medium: false, campaign: false, content: false, term: false, shortUrl: false });
        setUpdateFields({
          title: false,
          baseUrl: false,
          source: false,
          medium: false,
          campaign: false,
          content: false,
          term: false,
          shortUrl: false,
        });
      }
      setError('');
      setPreviewUrl('');
    }
  }, [isOpen, mode, initialData, list.baseUrl]);

  useEffect(() => {
    if (mode !== 'bulk') {
      if (title && baseUrl && source && medium && campaign) {
        const validation = validateUrl(baseUrl);
        if (validation.valid) {
          if (isIncremental) {
            const n = incrementStart;
            const replaceN = (val: string, nVal: number, isEnabled: boolean) => {
              if (!isEnabled) return val;
              if (val.includes('{n}')) return val.replace(/\{n\}/g, nVal.toString());
              return `${val}${nVal}`;
            };
            const tSource = replaceN(source, n, incrementFields.source);
            const tMedium = replaceN(medium, n, incrementFields.medium);
            const tCampaign = replaceN(campaign, n, incrementFields.campaign);
            const tContent = replaceN(content, n, incrementFields.content);
            const tTerm = replaceN(term, n, incrementFields.term);
            const url = buildUTMLink(baseUrl, tSource, tMedium, tCampaign, tContent, tTerm);
            setPreviewUrl(url);
          } else {
            const url = buildUTMLink(baseUrl, source, medium, campaign, content, term);
            setPreviewUrl(url);
          }
          setError('');
        } else {
          setPreviewUrl('');
          // Don't show error immediately while typing, only if it's clearly invalid format that breaks URL construction
          // But validateUrl is strict. Let's just clear preview.
        }
      } else {
        setPreviewUrl('');
      }
    }
  }, [baseUrl, title, source, medium, campaign, content, term, mode, isIncremental, incrementStart, incrementFields]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'bulk') {
      const replaceN = (val: string, nVal: number, isEnabled: boolean) => {
        if (!isEnabled) return val;
        if (val.includes('{n}')) return val.replace(/\{n\}/g, nVal.toString());
        return `${val}${nVal}`;
      };

      if (isIncremental) {
        const updatesArray: Partial<UTMLink>[] = [];
        const count = selectedCount || 0;
        
        for (let i = 0; i < count; i++) {
          const n = incrementStart + i;
          const updates: Partial<UTMLink> = {};
          
          if (updateFields.title) updates.title = replaceN(title, n, incrementFields.title);
          if (updateFields.baseUrl) updates.baseUrl = baseUrl;
          if (updateFields.source) updates.utmSource = normalizeUTMValue(replaceN(source, n, incrementFields.source));
          if (updateFields.medium) updates.utmMedium = normalizeUTMValue(replaceN(medium, n, incrementFields.medium));
          if (updateFields.campaign) updates.utmCampaign = normalizeUTMValue(replaceN(campaign, n, incrementFields.campaign));
          if (updateFields.content) updates.utmContent = normalizeUTMValue(replaceN(content, n, incrementFields.content));
          if (updateFields.term) updates.utmTerm = normalizeUTMValue(replaceN(term, n, incrementFields.term));
          if (updateFields.shortUrl) updates.shortUrl = replaceN(shortUrl, n, incrementFields.shortUrl);
          
          updatesArray.push(updates);
        }
        
        if (Object.keys(updatesArray[0]).length === 0) {
          return setError('Selecciona al menos un campo para actualizar.');
        }
        
        onSave(updatesArray);
        onClose();
        return;
      }

      const updates: Partial<UTMLink> = {};
      if (updateFields.title) {
        if (!title) return setError('El título no puede estar vacío si se va a actualizar.');
        updates.title = title;
      }
      if (updateFields.baseUrl) {
        if (!baseUrl) return setError('La URL base no puede estar vacía si se va a actualizar.');
        const validation = validateUrl(baseUrl);
        if (!validation.valid) return setError(validation.error || 'URL inválida');
        updates.baseUrl = fixUrl(baseUrl);
      }
      if (updateFields.source) {
        if (!source) return setError('El Source no puede estar vacío si se va a actualizar.');
        updates.utmSource = normalizeUTMValue(source);
      }
      if (updateFields.medium) {
        if (!medium) return setError('El Medium no puede estar vacío si se va a actualizar.');
        updates.utmMedium = normalizeUTMValue(medium);
      }
      if (updateFields.campaign) {
        if (!campaign) return setError('La Campaign no puede estar vacía si se va a actualizar.');
        updates.utmCampaign = normalizeUTMValue(campaign);
      }
      if (updateFields.content) updates.utmContent = normalizeUTMValue(content);
      if (updateFields.term) updates.utmTerm = normalizeUTMValue(term);
      if (updateFields.shortUrl) updates.shortUrl = shortUrl;

      if (Object.keys(updates).length === 0) {
        return setError('Selecciona al menos un campo para actualizar.');
      }

      onSave(updates);
      onClose();
      return;
    }

    if (!title || !baseUrl || !source || !medium || !campaign) {
      setError('Por favor, completa los campos obligatorios.');
      return;
    }

    const validation = validateUrl(baseUrl);
    if (!validation.valid) {
      return setError(validation.error || 'La URL base no es válida.');
    }
    const fixedBaseUrl = fixUrl(baseUrl);

    if (mode === 'create' && isIncremental) {
      const linksToCreate = [];
      const replaceN = (val: string, nVal: number, isEnabled: boolean) => {
        if (!isEnabled) return val;
        if (val.includes('{n}')) return val.replace(/\{n\}/g, nVal.toString());
        return `${val}${nVal}`;
      };
      
      for (let n = incrementStart; n <= incrementEnd; n++) {
        const tTitle = replaceN(title, n, incrementFields.title);
        const tSource = replaceN(source, n, incrementFields.source);
        const tMedium = replaceN(medium, n, incrementFields.medium);
        const tCampaign = replaceN(campaign, n, incrementFields.campaign);
        const tContent = replaceN(content, n, incrementFields.content);
        const tTerm = replaceN(term, n, incrementFields.term);
        const tShortUrl = replaceN(shortUrl, n, incrementFields.shortUrl);
        
        const finalUrl = buildUTMLink(fixedBaseUrl, tSource, tMedium, tCampaign, tContent, tTerm);
        
        linksToCreate.push({
          title: tTitle,
          baseUrl: fixedBaseUrl,
          utmSource: normalizeUTMValue(tSource),
          utmMedium: normalizeUTMValue(tMedium),
          utmCampaign: normalizeUTMValue(tCampaign),
          utmContent: normalizeUTMValue(tContent),
          utmTerm: normalizeUTMValue(tTerm),
          shortUrl: tShortUrl,
          finalUrl
        });
      }
      
      try {
        await onSave(linksToCreate);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Error al guardar los enlaces.');
      }
      return;
    }

    const finalUrl = buildUTMLink(fixedBaseUrl, source, medium, campaign, content, term);

    try {
      await onSave({
        title,
        baseUrl: fixedBaseUrl,
        utmSource: normalizeUTMValue(source),
        utmMedium: normalizeUTMValue(medium),
        utmCampaign: normalizeUTMValue(campaign),
        utmContent: normalizeUTMValue(content),
        utmTerm: normalizeUTMValue(term),
        shortUrl,
        finalUrl
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el enlace.');
    }
  };

  const handleCopy = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderField = (
    id: keyof typeof updateFields | 'title',
    label: string,
    value: string,
    onChange: (val: string) => void,
    required: boolean,
    placeholder: string,
    tooltip?: string,
    question?: string
  ) => {
    const isBulk = mode === 'bulk';
    const isTitle = id === 'title';
    
    if (isBulk && isTitle && !isIncremental) return null;

    const isEnabled = !isBulk || (isTitle ? updateFields.title : updateFields[id as keyof typeof updateFields]);
    const showIncrement = (mode === 'create' || (mode === 'bulk' && isEnabled)) && isIncremental && id !== 'baseUrl';

    return (
      <div className={isTitle || id === 'baseUrl' || id === 'shortUrl' ? 'col-span-1 md:col-span-2' : 'col-span-1'}>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider" title={tooltip}>
            {label} {required && !isBulk && <span className="text-red-400">*</span>}
          </label>
          <div className="flex items-center gap-3">
            {showIncrement && (
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md cursor-pointer border border-indigo-100 hover:bg-indigo-100 transition-colors" title="Añadir incremento a este campo">
                <input
                  type="checkbox"
                  checked={incrementFields[id as keyof typeof incrementFields]}
                  onChange={(e) => setIncrementFields({ ...incrementFields, [id]: e.target.checked })}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                />
                <span>INCREMENTAR</span>
              </label>
            )}
            {isBulk && (
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md cursor-pointer border border-amber-100 hover:bg-amber-100 transition-colors">
                <input
                  type="checkbox"
                  checked={isTitle ? updateFields.title : updateFields[id as keyof typeof updateFields]}
                  onChange={(e) => setUpdateFields({ ...updateFields, [id]: e.target.checked })}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>ACTUALIZAR</span>
              </label>
            )}
          </div>
        </div>
        {question && (
          <p className="text-xs text-gray-500 mb-2">{question}</p>
        )}
        <input
          type="text"
          required={required && !isBulk}
          disabled={!isEnabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${!isEnabled ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-300 shadow-sm'}`}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Crear nuevo link' : mode === 'edit' ? 'Editar link' : `Edición masiva (${selectedCount} links)`}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Configura los parámetros UTM y opciones de enlace</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Sidebar: Context & Advanced Options */}
              <div className="lg:col-span-4 space-y-8">
                <section>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contexto</h3>
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Espacio</span>
                      <span className="font-semibold text-gray-900 truncate">{space.name}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Proyecto</span>
                      <span className="font-semibold text-gray-900 truncate">{project.name}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Lista</span>
                      <span className="font-semibold text-gray-900 truncate">{list.name}</span>
                    </div>
                  </div>
                </section>

                {(mode === 'create' || mode === 'bulk') && (
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Opciones Avanzadas</h3>
                    <div className={`p-5 rounded-xl border transition-colors ${isIncremental ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${isIncremental ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isIncremental ? 'left-6' : 'left-1'}`} />
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isIncremental} 
                          onChange={(e) => setIsIncremental(e.target.checked)}
                          className="sr-only"
                        />
                        <span className={`text-sm font-bold ${isIncremental ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {mode === 'create' ? 'Creación masiva' : 'Edición masiva'}
                        </span>
                      </label>
                      
                      {isIncremental && (
                        <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase">Desde</span>
                              <input type="number" min="1" value={incrementStart} onChange={e => setIncrementStart(Number(e.target.value) || 1)} className="w-full p-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                            </div>
                            {mode === 'create' && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase">Hasta</span>
                                <input type="number" min={incrementStart} value={incrementEnd} onChange={e => setIncrementEnd(Number(e.target.value) || incrementStart)} className="w-full p-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-medium text-indigo-700 bg-white/50 p-2.5 rounded-lg border border-indigo-100 text-center">
                            {mode === 'create' ? `Se generarán ${Math.max(0, incrementEnd - incrementStart + 1)} enlaces` : `Actualizando ${selectedCount} enlaces`}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {mode === 'bulk' && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Nota:</strong> Solo se actualizarán los campos que tengan marcada la casilla de verificación.
                    </p>
                  </div>
                )}
              </div>

              {/* Main Form Area */}
              <div className="lg:col-span-8">
                <form id="link-form" onSubmit={handleSubmit} className="space-y-10">
                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-start gap-3 animate-in fade-in zoom-in-95">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Identificación y URL</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderField('title', 'Título del Enlace', title, setTitle, true, 'Ej: Post Facebook Promo Verano')}
                        {renderField('baseUrl', 'URL de Destino', baseUrl, setBaseUrl, true, 'https://ejemplo.com/...')}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Parámetros UTM</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {renderField('source', 'UTM Source', source, setSource, true, 'organico, pago, listas anteriores.', undefined, '¿De que tipo de tráfico viene?')}
                        {renderField('medium', 'UTM Medium', medium, setMedium, true, 'bioinsta, directfb', undefined, '¿De donde se registro?')}
                        {renderField('campaign', 'UTM Campaign', campaign, setCampaign, true, 'L1-IMP, LP1-ECO', undefined, 'Nombre Campaña')}
                        {renderField('content', 'UTM Content (Opc)', content, setContent, false, 'bio, directmanychat', undefined, '¿Pieza de contenido?')}
                        {renderField('term', 'UTM Placement (Opc)', term, setTerm, false, 'Instagram,facebook,youtube', undefined, '¿Plataforma en la que se registró?')}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Enlace Acortado</h3>
                      <div className="grid grid-cols-1 gap-6">
                        {renderField('shortUrl', 'Link acortado (Opcional)', shortUrl, setShortUrl, false, 'https://bit.ly/..., usa {n} para incrementos')}
                      </div>
                    </section>
                  </div>

                  {mode !== 'bulk' && previewUrl && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Vista Previa del Enlace Generado</h3>
                      <div className="p-6 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 group relative">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-2">
                              {isIncremental ? `Primer enlace de la serie (n=${incrementStart})` : 'URL Final con UTMs'}
                            </p>
                            <p className="text-sm text-white break-all font-mono leading-relaxed">{previewUrl}</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={handleCopy} 
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all shrink-0 border border-white/10"
                            title="Copiar enlace"
                          >
                            {copied ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
                          </button>
                        </div>
                      </div>
                    </section>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end items-center gap-4 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-all">
            Cancelar
          </button>
          <button 
            type="submit" 
            form="link-form" 
            disabled={mode !== 'bulk' && !previewUrl && !error} 
            className="px-8 py-3 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-100 flex items-center gap-2"
          >
            {mode === 'create' ? (
              isIncremental ? (
                <>Crear {Math.max(0, incrementEnd - incrementStart + 1)} enlaces</>
              ) : 'Crear Enlace'
            ) : mode === 'edit' ? 'Guardar Cambios' : 'Actualizar Enlaces'}
          </button>
        </div>
      </div>
    </div>
  );
}
