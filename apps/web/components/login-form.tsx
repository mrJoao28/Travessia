"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest, hasSession } from "../lib/auth-client";

type Mode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [mode, setMode] = useState<Mode>("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const registering = mode === "register";
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  function switchMode(next: Mode) {
    if (pending) return;
    setMode(next);
    setError("");
  }
  return (
    <section className="login-form" id="conteudo" tabIndex={-1}>
      <p className="eyebrow">BEM-VINDO AO TRAVESSIA</p>
      <h2>{registering ? "Crie sua conta." : "Seu próximo passo começa aqui."}</h2>
      <p>
        {registering
          ? "O cadastro fica nesta plataforma. Depois você entra em uma turma com o código do professor."
          : "Entre com o e-mail e a senha da sua conta."}
      </p>
      <noscript><p>Ative o JavaScript para entrar com segurança.</p></noscript>
      <form
        className="form-stack"
        method="post"
        action="/login"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready || pending) return;
          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") ?? "").trim();
          const password = String(form.get("password") ?? "");
          setPending(true);
          setError("");
          try {
            if (registering) {
              const name = String(form.get("name") ?? "").trim();
              if (password !== String(form.get("passwordConfirm") ?? ""))
                throw new Error("As senhas não coincidem.");
              await authRequest("sign-up/email", {
                name,
                email,
                password,
                rememberMe: false,
              });
            } else {
              await authRequest("sign-in/email", {
                email,
                password,
                rememberMe: false,
              });
            }
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
            aria-label={registering ? "Erro ao criar conta" : "Erro ao entrar"}
            tabIndex={-1}
            ref={errorRef}
          >
            <strong>
              {registering ? "Não foi possível criar a conta" : "Não foi possível entrar"}
            </strong>
            <p>{error}</p>
          </div>
        )}
        {registering && (
          <label htmlFor="name">
            Nome
            <input
              id="name"
              disabled={!ready || pending}
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
        )}
        <label htmlFor="email">
          Email
          <input
            id="email"
            disabled={!ready || pending}
            name="email"
            type="email"
            autoComplete={registering ? "email" : "username"}
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
            autoComplete={registering ? "new-password" : "current-password"}
            required
            minLength={registering ? 12 : undefined}
            maxLength={128}
          />
        </label>
        {registering && (
          <label htmlFor="passwordConfirm">
            Confirmar senha
            <input
              id="passwordConfirm"
              disabled={!ready || pending}
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
        )}
        {registering && (
          <p className="small">Use de 12 a 128 caracteres. A conta não recebe um papel de professor automaticamente.</p>
        )}
        <button className="button" disabled={!ready || pending}>
          {pending ? (registering ? "Criando conta…" : "Entrando…") : registering ? "Criar conta" : "Entrar"}
        </button>
        <p role="status" className="sr-only">
          {pending
            ? registering
              ? "Criando a conta no servidor."
              : "Validando as credenciais com o servidor."
            : ""}
        </p>
      </form>
      <p className="small">
        <button
          type="button"
          className="text-link"
          disabled={!ready || pending}
          onClick={() => switchMode(registering ? "login" : "register")}
        >
          {registering ? "Já tenho uma conta" : "Criar uma conta"}
        </button>
      </p>
      <Link className="text-link" href="/previa/aluno">
        Conhecer a prévia visual com dados fictícios
      </Link>
    </section>
  );
}
