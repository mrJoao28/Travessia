'use client';

import { useEffect, useState } from 'react';

type Preferences = { scale: string; contrast: boolean; focus: boolean; spacing: boolean };
const defaults: Preferences = { scale: '1', contrast: false, focus: false, spacing: false };
const key = 'travessia:reading:v1';

export function ReadingPreferences() {
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (stored && ['1', '1.125', '1.25'].includes(stored.scale)) {
        setPreferences({ scale: stored.scale, contrast: stored.contrast === true, focus: stored.focus === true, spacing: stored.spacing === true });
      }
    } catch { /* O armazenamento pode estar indisponível; os controles continuam utilizáveis. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.style.fontSize = `${Number(preferences.scale) * 100}%`;
    root.dataset.contrast = String(preferences.contrast);
    root.dataset.focus = String(preferences.focus);
    root.dataset.spacing = String(preferences.spacing);
    try { localStorage.setItem(key, JSON.stringify(preferences)); } catch { /* Persistência opcional. */ }
  }, [preferences, ready]);
  return <details className="preferences" id="preferencias">
    <summary>Aa · Ajustar leitura</summary>
    <div className="preferences-panel">
      <h2>Aprenda do seu jeito</h2>
      <label htmlFor="text-scale">Tamanho do texto</label>
      <select id="text-scale" value={preferences.scale} onChange={event => setPreferences(p => ({ ...p, scale: event.target.value }))}>
        <option value="1">Padrão</option><option value="1.125">Ampliado</option><option value="1.25">Maior</option>
      </select>
      <label className="check"><input type="checkbox" checked={preferences.contrast} onChange={event => setPreferences(p => ({ ...p, contrast: event.target.checked }))} />Mais contraste</label>
      <label className="check"><input type="checkbox" checked={preferences.focus} onChange={event => setPreferences(p => ({ ...p, focus: event.target.checked }))} />Reduzir elementos decorativos</label>
      <label className="check"><input type="checkbox" checked={preferences.spacing} onChange={event => setPreferences(p => ({ ...p, spacing: event.target.checked }))} />Mais espaço entre linhas</label>
      <button type="button" className="text-button" onClick={() => setPreferences(defaults)}>Restaurar preferências</button>
      <p className="small">Estas preferências ficam neste navegador. Você também pode usar o zoom do navegador.</p>
    </div>
  </details>;
}
