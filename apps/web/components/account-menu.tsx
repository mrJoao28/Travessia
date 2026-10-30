"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { authRequest } from "../lib/auth-client";
import { Icon } from "./icons";
export type AccountView = {
  name: string;
  course: string | null;
  switchHref?: string;
  switchLabel?: string;
};
export function AccountMenu({
  account,
  preview,
  student,
}: {
  account?: AccountView;
  preview: boolean;
  student: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <details
      className="account"
      ref={details}
      onKeyDown={(e) => {
        if (e.key === "Escape" && details.current) {
          details.current.open = false;
          details.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label="Menu da conta">
        {preview
          ? "J"
          : (account?.name.slice(0, 1).toUpperCase() ?? <Icon name="users" />)}
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="account-panel">
        {preview ? (
          <>
            <strong>Prévia visual</strong>
            <p className="small">Dados fictícios, sem sessão.</p>
            <Link href={`/previa/${student ? "professor" : "aluno"}`}>
              Ver prévia {student ? "do professor" : "do aluno"}
            </Link>
          </>
        ) : account ? (
          <>
            <strong>{account.name}</strong>
            <p className="small">{account.course}</p>
            <Link className="text-link" href={`/perfil?espaco=${student ? "aluno" : "professor"}`}>Meu perfil</Link>
            {account.switchHref && (
              <Link className="text-link" href={account.switchHref}>
                {account.switchLabel}
              </Link>
            )}
            <button
              className="text-button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setMessage("");
                try {
                  await authRequest("sign-out", {});
                  window.location.assign("/login");
                } catch {
                  setMessage(
                    "Não foi possível confirmar a saída. Tente novamente.",
                  );
                  setPending(false);
                }
              }}
            >
              {pending ? "Encerrando…" : "Sair da conta"}
            </button>
            <p role="status">{message}</p>
          </>
        ) : (
          <Link href="/login">Entrar na sua conta</Link>
        )}
      </div>
    </details>
  );
}
