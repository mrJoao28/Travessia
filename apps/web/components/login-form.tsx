"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest, hasSession } from "../lib/auth-client";
export function LoginForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  return (
    <section className="login-form" id="conteudo" tabIndex={-1}>
      <p className="eyebrow">BEM-VINDO AO TRAVESSIA</p>
      <h2>Seu próximo passo começa aqui.</h2>
      <p>Entre com a conta configurada para a demonstração.</p>
      <noscript><p>Ative o JavaScript para entrar com segurança.</p></noscript>
      <form
        className="form-stack"
        method="post"
        action="/login"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready || pending) return;
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError("");
          try {
            await authRequest("sign-in/email", {
              email: form.get("email"),
              password: form.get("password"),
              rememberMe: false,
            });
            if (!hasSession(await authRequest("get-session")))
              throw new Error(
                "Não foi possível confirmar sua sessão. Tente novamente.",
              );
            router.replace("/aluno");
            router.refresh();
          } catch (reason) {
            setError(
              reason instanceof Error &&
                reason.name !== "TimeoutError" &&
                reason.name !== "TypeError"
                ? reason.message
                : "Não foi possível conectar ao serviço. Seus dados permanecem no formulário.",
            );
          } finally {
            setPending(false);
          }
        }}
        aria-busy={pending}
      >
        {error && (
          <div
            className="form-error"
            role="alert"
            aria-label="Erro ao entrar"
            tabIndex={-1}
            ref={errorRef}
          >
            <strong>Não foi possível entrar</strong>
            <p>{error}</p>
          </div>
        )}
        <label htmlFor="email">
          Email
          <input
            id="email"
            disabled={!ready || pending}
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
          />
        </label>
        <label htmlFor="password">
          Senha
          <input
            id="password"
            disabled={!ready || pending}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="button" disabled={!ready || pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
        <p role="status" className="sr-only">
          {pending ? "Validando as credenciais com o servidor." : ""}
        </p>
      </form>
      <p className="small">
        O cadastro público está fechado. As credenciais são configuradas
        privadamente.
      </p>
      <Link className="text-link" href="/previa/aluno">
        Conhecer a prévia visual com dados fictícios
      </Link>
    </section>
  );
}
