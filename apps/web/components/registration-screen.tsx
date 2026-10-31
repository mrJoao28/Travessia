"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authRequest, hasSession } from "../lib/auth-client";
import { AuthIntro } from "./auth-intro";
import { Icon } from "./icons";
import { StartingSpaceChoice, type StartingSpace } from "./starting-space";

export function RegistrationScreen() {
  const router = useRouter();
  const [space, setSpace] = useState<StartingSpace>("aluno");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [confirmationError, setConfirmationError] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const disabled = !ready || pending || created;
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <main className="login-shell registration-shell">
      <AuthIntro teacher={space === "professor"} />
      <section className="login-form registration-form" id="conteudo" tabIndex={-1}>
        <p className="eyebrow">BEM-VINDO AO TRAVESSIA</p>
        <h1>Crie sua conta</h1>
        <noscript><p>Ative o JavaScript para criar sua conta com segurança.</p></noscript>
        <form className="form-stack" method="post" action="/cadastro" ref={formRef} aria-busy={pending}
          onSubmit={async event => {
            event.preventDefault();
            if (disabled) return;
            const form = new FormData(event.currentTarget);
            const name = String(form.get("name") ?? "").trim();
            const password = String(form.get("password") ?? "");
            setError(""); setConfirmationError(false);
            if (name.length < 2) {
              setError("Informe seu nome com pelo menos dois caracteres."); return;
            }
            if (password !== String(form.get("passwordConfirm") ?? "")) {
              setConfirmationError(true); setError("As senhas não coincidem. Confira a confirmação da senha."); return;
            }
            setPending(true);
            try {
              await authRequest("sign-up/email", { name, email: String(form.get("email") ?? "").trim(), password, rememberMe: false });
              setCreated(true);
              // Account creation is not retried when only session confirmation fails.
              if (!hasSession(await authRequest("get-session"))) throw new Error("Sua conta foi criada. Entre para continuar.");
              formRef.current?.reset();
              router.replace(`/boas-vindas?espaco=${space}`);
              router.refresh();
            } catch (reason) {
              setError(reason instanceof Error && !["TimeoutError", "TypeError"].includes(reason.name)
                ? reason.message : "Não foi possível confirmar a conexão. Se a conta já foi criada, entre com seu e-mail e senha. Seus dados permanecem nesta tela.");
            } finally { setPending(false); }
          }}>
          <StartingSpaceChoice value={space} onChange={setSpace} disabled={disabled} />
          <p className="registration-context">{space === "aluno" ? "Entre na sua turma e avance no seu ritmo." : "Prepare suas turmas e acompanhe cada aluno."}</p>
          {error && <div className="form-error" role="alert" aria-label="Erro ao criar conta" tabIndex={-1} ref={errorRef}>
            <strong>{created ? "Sua conta foi criada" : "Não foi possível concluir o cadastro"}</strong>
            <p>{error}</p>
            {confirmationError && <button type="button" className="text-button" onClick={() => formRef.current?.querySelector<HTMLInputElement>('[name="passwordConfirm"]')?.focus()}>Conferir confirmação da senha</button>}
            <Link className="text-link" href="/login">Entrar na minha conta</Link>
          </div>}
          <label htmlFor="register-name">Nome completo
            <input id="register-name" name="name" autoComplete="name" required minLength={2} maxLength={80} disabled={disabled} placeholder="Seu nome completo" />
          </label>
          <label htmlFor="register-email">E-mail
            <input id="register-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={disabled} placeholder="Seu e-mail" />
          </label>
          <div>
            <label htmlFor="register-password">Senha</label>
            <div className="password-control">
              <input id="register-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} disabled={disabled} />
              <button type="button" className="password-toggle" disabled={disabled} aria-label={showPassword ? "Ocultar senhas" : "Mostrar senhas"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><Icon name="eye" /></button>
            </div>
          </div>
          <label htmlFor="register-confirmation">Confirmar senha
            <input id="register-confirmation" name="passwordConfirm" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} disabled={disabled}
              aria-invalid={confirmationError || undefined} aria-describedby={confirmationError ? "register-confirmation-help" : undefined} onChange={() => setConfirmationError(false)} />
          </label>
          {confirmationError && <p className="small" id="register-confirmation-help">Digite a mesma senha nos dois campos.</p>}
          <button className="button" disabled={disabled}>{pending ? "Criando conta…" : created ? "Conta criada" : "Criar minha conta"}</button>
          <p className="sr-only" role="status">{pending ? "Criando sua conta. Aguarde a confirmação." : ""}</p>
        </form>
        <p className="registration-login">Já tem uma conta? <Link className="text-link" href="/login">Entrar</Link></p>
        <p className="small registration-later">{space === "aluno" ? "Você pode completar seu perfil depois." : "Disciplinas e cursos podem ser preenchidos depois."}</p>
      </section>
    </main>
  </>;
}
