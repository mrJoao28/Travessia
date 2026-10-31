"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage } from "../lib/product-client";
import { Brand } from "./icons";
import { StartingSpaceChoice, type StartingSpace } from "./starting-space";

export function WelcomeScreen({ initialSpace }: { initialSpace?: StartingSpace }) {
  const router = useRouter();
  const [space, setSpace] = useState<StartingSpace>(initialSpace ?? "aluno");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [expired, setExpired] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setAuthenticated(false); setExpired(false);
    api("me").then(me => { if (active) { setName(me.name); setAuthenticated(true); } })
      .catch(reason => { if (active) { setExpired(reason instanceof ApiError && reason.status === 401); setError(errorMessage(reason)); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <main id="conteudo" className="welcome-shell" tabIndex={-1}>
      <Link className="brand" href="/login" aria-label="Travessia"><Brand /></Link>
      <section className="paper welcome-card">
        <p className="eyebrow">SEU PRIMEIRO PASSO</p>
        <h1>Vamos começar?</h1>
        {loading ? <p role="status">Confirmando sua sessão…</p> : <>
          {error && <div className="form-error" role="alert" ref={errorRef} tabIndex={-1}><p>{error}</p>
            {expired ? <Link className="text-link" href="/login">Entrar na minha conta</Link> : !authenticated && <button className="text-button" onClick={() => setRetry(retry + 1)}>Tentar novamente</button>}
          </div>}
          {authenticated && <>
            <p>Bem-vindo ao Travessia, {name}. {initialSpace ? "Sua conta está pronta para começar." : "Escolha seu próximo passo."}</p>
            {!initialSpace && <StartingSpaceChoice value={space} onChange={next => { setSpace(next); setError(""); }} disabled={pending} />}
            <form key={space} className="form-stack welcome-action" method="post" action="/boas-vindas" aria-busy={pending} onSubmit={async event => {
              event.preventDefault(); if (pending) return;
              const form = new FormData(event.currentTarget);
              const value = String(form.get("value") ?? "").trim();
              setPending(true); setError("");
              try {
                const room = space === "professor" ? await api("createClassroom", { body: { name: value } }) : await api("acceptInvite", { body: { token: value } });
                router.replace(`/${space}?turma=${encodeURIComponent(room.id)}`); router.refresh();
              } catch (reason) {
                setError(reason instanceof ApiError && reason.code === "INVALID_INVITATION"
                  ? "Este convite está indisponível ou expirou. Peça um novo código ao professor."
                  : reason instanceof ApiError && reason.code === "MEMBERSHIP_EXISTS"
                    ? "Sua conta já possui um vínculo com essa turma. Consulte Minhas turmas ou peça ajuda ao professor."
                    : errorMessage(reason));
                setPending(false);
              }
            }}>
              <h2>{space === "professor" ? "Crie sua primeira turma" : "Entre na sua turma"}</h2>
              <p>{space === "professor" ? "Dê um nome à turma. Depois você poderá convidar os alunos e preparar a primeira missão." : "Cole o código que o professor compartilhou com você. Ainda não recebeu? Você pode entrar depois."}</p>
              <label htmlFor="welcome-value">{space === "professor" ? "Nome da turma" : "Código de convite"}
                <input id="welcome-value" name="value" required maxLength={space === "professor" ? 200 : 64} minLength={space === "professor" ? 1 : 64}
                  pattern={space === "professor" ? undefined : "[a-f0-9]{64}"} autoComplete="off" disabled={pending} />
              </label>
              <button className="button" disabled={pending}>{pending ? "Aguarde…" : space === "professor" ? "Criar minha turma" : "Entrar na turma"}</button>
            </form>
            <p><Link className="text-link" href={`/${space}`}>Fazer isso depois</Link></p>
            <p className="small">A mesma conta pode participar como aluno e professor em turmas diferentes. Você pode completar os dados acadêmicos em <Link className="text-link" href={`/perfil?espaco=${space}`}>Meu perfil</Link>.</p>
          </>}
        </>}
      </section>
    </main>
  </>;
}
