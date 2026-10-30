"use client";

import { useEffect, useRef } from "react";

export function TeacherSteps({ labels, current, onBack, disabled = false }: {
  labels: string[]; current: number; onBack: (step: number) => void; disabled?: boolean;
}) {
  return <nav className="teacher-steps" aria-label="Etapas de preparação"><ol>{labels.map((label, index) =>
    <li key={label} aria-current={index === current ? "step" : undefined} className={index <= current ? "step-reached" : ""}>
      <button type="button" disabled={disabled || index >= current} onClick={() => onBack(index)} aria-label={`Etapa ${index + 1}: ${label}`}>
        <span className="step-number" aria-hidden="true">{index < current ? "✓" : index + 1}</span><span>{label}</span>
      </button>
    </li>)}</ol></nav>;
}

/** Protect both full-page navigation and internal Next links. Never store private drafts locally. */
export function useTeacherDraftGuard(dirty: boolean) {
  const leaving = useRef(false);
  useEffect(() => {
    leaving.current = false;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty && !leaving.current) event.preventDefault(); };
    const click = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (!window.confirm("Há alterações ainda não salvas. Sair desta tela e descartar essas alterações?")) { event.preventDefault(); event.stopPropagation(); }
      else leaving.current = true;
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); };
  }, [dirty]);
}
