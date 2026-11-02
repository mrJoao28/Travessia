"use client";

import { useEffect, useRef, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";

type Preferences = {
  scale: string;
  contrast: boolean;
  theme: "light" | "dark";
  focus: boolean;
  spacing: boolean;
};
const defaults: Preferences = {
  scale: "1",
  contrast: false,
  theme: "light",
  focus: false,
  spacing: false,
};
const key = "travessia:reading:v1";

export function ReadingPreferences({
  accountPreferences,
}: {
  accountPreferences?: ApiResponse<"preferences">;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const themeDetails = useRef<HTMLDetailsElement>(null);
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (accountPreferences)
      setPreferences((current) => ({
        ...current,
        scale:
          accountPreferences.fontSize === "larger"
            ? "1.25"
            : accountPreferences.fontSize === "large"
              ? "1.125"
              : "1",
        contrast: accountPreferences.contrast === "high",
        spacing: accountPreferences.spacing === "wide",
        focus: accountPreferences.reducedDistractions === true,
      }));
  }, [accountPreferences]);
  useEffect(() => {
    const open = (
      target: HTMLDetailsElement | null,
      other: HTMLDetailsElement | null,
    ) => {
      if (target) {
        if (other) other.open = false;
        target.open = true;
        target.querySelector("summary")?.focus();
      }
    };
    const openFromHash = () => {
      if (window.location.hash === "#preferencias")
        open(details.current, themeDetails.current);
      if (window.location.hash === "#temas")
        open(themeDetails.current, details.current);
    };
    const openFromLink = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest('a[href="#preferencias"], a[href="#temas"]')
      ) {
        const link = event.target.closest(
          'a[href="#preferencias"], a[href="#temas"]',
        );
        if (!(link instanceof HTMLAnchorElement)) return;
        if (link?.hash === "#preferencias")
          open(details.current, themeDetails.current);
        if (link?.hash === "#temas")
          open(themeDetails.current, details.current);
      }
    };
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", openFromLink);
    openFromHash();
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "null");
      if (stored && typeof stored === "object") {
        const theme = stored.theme === "dark" ? "dark" : "light";
        document.documentElement.dataset.theme = theme;
        setPreferences({
          scale: ["1", "1.125", "1.25"].includes(stored.scale)
            ? stored.scale
            : defaults.scale,
          contrast: stored.contrast === true,
          theme,
          focus: stored.focus === true,
          spacing: stored.spacing === true,
        });
      }
    } catch {
      /* O armazenamento pode estar indisponível; os controles continuam utilizáveis. */
    }
    setReady(true);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", openFromLink);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.style.fontSize = `${Number(preferences.scale) * 100}%`;
    root.dataset.contrast = String(preferences.contrast);
    root.dataset.theme = preferences.theme;
    root.dataset.focus = String(preferences.focus);
    root.dataset.spacing = String(preferences.spacing);
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch {
      /* Persistência opcional. */
    }
  }, [preferences, ready]);
  return (
    <>
      <details
        className="preferences"
        id="preferencias"
        ref={details}
        onToggle={(event) => {
          if (event.currentTarget.open && themeDetails.current?.open)
            themeDetails.current.open = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && details.current?.open) {
            details.current.open = false;
            details.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>Aa · Ajustar leitura</summary>
        <div className="preferences-panel">
          <h2>Aprenda do seu jeito</h2>
          <label htmlFor="text-scale">Tamanho do texto</label>
          <select
            id="text-scale"
            value={preferences.scale}
            onChange={(event) =>
              setPreferences((p) => ({ ...p, scale: event.target.value }))
            }
          >
            <option value="1">Padrão</option>
            <option value="1.125">Ampliado</option>
            <option value="1.25">Maior</option>
          </select>
          <label className="check">
            <input
              type="checkbox"
              checked={preferences.focus}
              onChange={(event) =>
                setPreferences((p) => ({ ...p, focus: event.target.checked }))
              }
            />
            Reduzir elementos decorativos
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={preferences.spacing}
              onChange={(event) =>
                setPreferences((p) => ({ ...p, spacing: event.target.checked }))
              }
            />
            Mais espaço entre linhas
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() => setPreferences(defaults)}
          >
            Restaurar todas as preferências
          </button>
          <p className="small">
            Tamanho, espaçamento e elementos decorativos ficam salvos neste navegador. Você também pode usar o zoom do navegador.
          </p>
        </div>
      </details>
      <details
        className="preferences"
        id="temas"
        ref={themeDetails}
        onToggle={(event) => {
          if (event.currentTarget.open && details.current?.open)
            details.current.open = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && themeDetails.current?.open) {
            themeDetails.current.open = false;
            themeDetails.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>Tema e contraste</summary>
        <div className="preferences-panel">
          <h2>Aparência do site</h2>
          <label className="check">
            <input
              type="checkbox"
              checked={preferences.theme === "dark"}
              onChange={(event) =>
                setPreferences((p) => ({
                  ...p,
                  theme: event.target.checked ? "dark" : "light",
                }))
              }
            />
            Modo escuro
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={preferences.contrast}
              onChange={(event) =>
                setPreferences((p) => ({ ...p, contrast: event.target.checked }))
              }
            />
            Mais contraste
          </label>
          {accountPreferences && (
            <button
              type="button"
              className="button button-outline"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setMessage("");
                try {
                  await api("preferences", {
                    body: {
                      fontSize:
                        preferences.scale === "1.25"
                          ? "larger"
                          : preferences.scale === "1.125"
                            ? "large"
                            : "default",
                      contrast: preferences.contrast ? "high" : "default",
                      spacing: preferences.spacing ? "wide" : "default",
                      reducedDistractions: preferences.focus,
                    },
                  });
                  setMessage(
                    "Preferências de acessibilidade salvas na conta. O tema fica salvo neste navegador.",
                  );
                } catch (reason) {
                  setMessage(errorMessage(reason));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Salvando…" : "Salvar preferências compatíveis na conta"}
            </button>
          )}
          <p className="small">
            Tema salvo neste navegador. O alto contraste é independente do tema.
            {accountPreferences
              ? " Use o botão para salvar as preferências de acessibilidade na conta."
              : " As preferências não são sincronizadas com uma conta nesta tela."}
          </p>
          <p role="status">{message}</p>
        </div>
      </details>
    </>
  );
}
