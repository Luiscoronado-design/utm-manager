export const normalizeUTMValue = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, ''); // Remove non-alphanumeric except hyphens and underscores
};

export const fixUrl = (url: string): string => {
  let fixed = url.trim();
  if (!fixed) return '';
  
  // Remove duplicate protocols if they exist (e.g. https://https://)
  fixed = fixed.replace(/^(https?:\/\/)+(https?:\/\/)/i, '$2');

  // Handle common typo: https// instead of https://
  if (fixed.startsWith('https//')) {
    fixed = 'https://' + fixed.slice(7);
  } else if (fixed.startsWith('http//')) {
    fixed = 'http://' + fixed.slice(6);
  }
  
  // Add protocol if missing (e.g., www.google.com -> https://www.google.com)
  if (!/^https?:\/\//i.test(fixed)) {
    fixed = 'https://' + fixed;
  }
  
  return fixed;
};

export const validateUrl = (url: string): { valid: boolean; error?: string } => {
  if (!url.trim()) return { valid: false, error: 'La URL es obligatoria.' };
  
  const fixed = fixUrl(url);
  try {
    const parsed = new URL(fixed);
    // Basic check for hostname (must have at least one dot for domain.tld, or be localhost)
    if (parsed.hostname !== 'localhost' && !parsed.hostname.includes('.')) {
       return { valid: false, error: 'La URL parece incompleta. Asegúrate de incluir el dominio (ej. .com)' };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'La URL no tiene un formato válido.' };
  }
};

export const buildUTMLink = (
  baseUrl: string,
  source: string,
  medium: string,
  campaign: string,
  content?: string,
  term?: string
): string => {
  try {
    const fixedBaseUrl = fixUrl(baseUrl);
    const url = new URL(fixedBaseUrl);
    
    if (source) url.searchParams.set('utm_source', normalizeUTMValue(source));
    if (medium) url.searchParams.set('utm_medium', normalizeUTMValue(medium));
    if (campaign) url.searchParams.set('utm_campaign', normalizeUTMValue(campaign));
    if (content) url.searchParams.set('utm_content', normalizeUTMValue(content));
    if (term) url.searchParams.set('utm_placement', normalizeUTMValue(term));
    
    return url.toString();
  } catch (e) {
    return '';
  }
};
