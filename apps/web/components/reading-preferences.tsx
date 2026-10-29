"use client";

import { useEffect, useRef, useState } from "react";
import { api, errorMessage, type ApiResponse } from "../lib/product-client";

type Preferences = {
  scale: string;
  contrast: boolean;
  focus: boolean;
  spacing: boolean;
};
const defaults: Preferences = {
  scale: "1",
  contrast: false,
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
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (accountPreferences)
      setPreferences({
        scale:
          accountPreferences.fontSize === "larger"
            ? "1.25"
            : accountPreferences.fontSize === "large"
              ? "1.125"
              : "1",
        contrast: accountPreferences.contrast === "high",
        spacing: accountPreferences.spacing === "wide",
        focus: accountPreferences.reducedDistractions === true,
      });
  }, [accountPreferences]);
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#preferencias" && details.current) {
        details.current.open = true;
        details.current.querySelector("summary")?.focus();
      }
    };
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "null");
      if (stored && ["1", "1.125", "1.25"].includes(stored.scale)) {
        setPreferences({
          scale: stored.scale,
          contrast: stored.contrast === true,
          focus: stored.focus === true,
          spacing: stored.spacing === true,
        });
      }
    } catch {
      /* O armazenamento pode estar indisponível; os controles continuam utilizáveis. */
    }
    setReady(true);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.style.fontSize = `${Number(preferences.scale) * 100}%`;
    root.dataset.contrast = String(preferences.contrast);
    root.dataset.focus = String(preferences.focus);
    root.dataset.spacing = String(preferences.spacing);
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch {
      /* Persistência opcional. */
    }
  }, [preferences, ready]);
  return (
    <details
      className="preferences"
      id="preferencias"
      ref={details}
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
            checked={preferences.contrast}
            onChange={(event) =>
              setPreferences((p) => ({ ...p, contrast: event.target.checked }))
            }
          />
          Mais contraste
        </label>
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
          Restaurar preferências
        </button>
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
                setMessage("Preferências salvas na sua conta.");
              } catch (reason) {
                setMessage(errorMessage(reason));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Salvando…" : "Salvar preferências na conta"}
          </button>
        )}
        <p className="small">
          As alterações se aplicam neste navegador.{" "}
          {accountPreferences
            ? "Use o botão para salvar na conta."
            : "Não há sincronização com uma conta nesta tela."}{" "}
          Você também pode usar o zoom do navegador.
        </p>
        <p role="status">{message}</p>
      </div>
    </details>
  );
}
