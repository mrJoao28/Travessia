"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage } from "../lib/product-client";
import { Brand } from "./icons";
import { usePendingInvitation } from "./use-pending-invitation";
import { invitationHref, normalizeInvitation } from "../lib/invitation";
import { StartingSpaceChoice, type StartingSpace } from "./starting-space";

export function WelcomeScreen({ initialSpace }: { initialSpace?: StartingSpace }) {
  const router = useRouter();
  const {invitation,clearInvitation}=usePendingInvitation();
  const [value,setValue]=useState("");
  useEffect(()=>{if(invitation){setSpace("aluno");setValue(invitation);setError("");}else setValue("");},[invitation]);
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
          {error && !(expired&&invitation) && <div className="form-error" role="alert" ref={errorRef} tabIndex={-1}><p>{error}</p>
            {expired ? <Link className="text-link" href={invitationHref("/login",invitation)}>Entrar na minha conta</Link> : !authenticated && <button className="text-button" onClick={() => setRetry(retry + 1)}>Tentar novamente</button>}
          </div>}
          {expired&&invitation&&<section className="form-stack"><h2>Você recebeu um convite de turma</h2><p>Entre na sua conta ou crie uma conta de aluno para continuar. Depois, você confirma sua entrada na turma.</p><Link className="button" href={invitationHref('/login',invitation)}>Entrar na minha conta</Link><Link className="text-link" href={invitationHref('/cadastro',invitation)}>Criar conta de aluno</Link></section>}
          {authenticated && <>
            {invitation&&<p className="notice">Você recebeu um convite. Confirme sua entrada na turma abaixo.</p>}
            <p>Bem-vindo ao Travessia, {name}. {initialSpace ? "Sua conta está pronta para começar." : "Escolha seu próximo passo."}</p>
            {!initialSpace && !invitation && <StartingSpaceChoice value={space} onChange={next => { setSpace(next); setValue(""); setError(""); }} disabled={pending} />}
            <form key={space} className="form-stack welcome-action" method="post" action="/boas-vindas" aria-busy={pending} onSubmit={async event => {
              event.preventDefault(); if (pending) return;
              const form = new FormData(event.currentTarget);
              const value = String(form.get("value") ?? "").trim();
              const token=normalizeInvitation(value,window.location.origin);
              if(space==="aluno"&&!token){setError("Cole o link do Travessia ou digite o código de oito caracteres recebido do professor.");return;}
              setPending(true); setError("");
              try {
                const room = space === "professor" ? await api("createClassroom", { body: { name: value } }) : await api("acceptInvite", { body: { token: token! } });
                if(space==="aluno")clearInvitation();
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
              <p>{space === "professor" ? "Dê um nome à turma. Depois você poderá convidar os alunos e preparar a primeira missão." : "Cole o link do convite ou digite o código curto que o professor compartilhou. Ainda não recebeu? Você pode entrar depois."}</p>
              <label htmlFor="welcome-value">{space === "professor" ? "Nome da turma" : "Código de convite"}
                <input id="welcome-value" name="value" required maxLength={space === "professor" ? 200 : 2048} minLength={1}
                  value={value} onChange={e=>setValue(e.target.value)} autoComplete="off" disabled={pending} />
              </label>
              <button className="button" disabled={pending}>{pending ? "Aguarde…" : space === "professor" ? "Criar minha turma" : "Entrar na turma"}</button>
            </form>
            <p><Link className="text-link" href={`/${space}`} onClick={()=>clearInvitation()}>Fazer isso depois</Link></p>
            <p className="small">A mesma conta pode participar como aluno e professor em turmas diferentes. Você pode completar os dados acadêmicos em <Link className="text-link" href={`/perfil?espaco=${space}`}>Meu perfil</Link>.</p>
          </>}
        </>}
      </section>
    </main>
  </>;
}
