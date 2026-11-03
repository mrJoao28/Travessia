"use client";

import { useEffect, useRef, useState } from 'react';
import { navigationLibrasDocument } from '../lib/navigation-libras';

export function NavigationLibras() {
  const dialog = useRef<HTMLDialogElement>(null), launcher = useRef<HTMLButtonElement>(null), frame = useRef<HTMLIFrameElement>(null), activation = useRef<HTMLButtonElement>(null);
  const [opened,setOpened] = useState(false);
  const [session,setSession] = useState<{token:string;document:string}|null>(null);
  const [status,setStatus] = useState<'idle'|'loading'|'ready'|'error'>('idle');
  const close = () => dialog.current?.close();
  function activate() {
    const token=crypto.randomUUID();
    const theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
    setStatus('loading');setSession({token,document:navigationLibrasDocument(theme,token)});
  }
  useEffect(()=>{
    if(!session)return;
    const timeout=setTimeout(()=>{setStatus(current=>current==='loading'?'error':current);},25000);
    function receive(event:MessageEvent) {
      if(event.source!==frame.current?.contentWindow || event.origin!=='null' || !event.data || event.data.channel!=='travessia-navigation-libras' || event.data.token!==session!.token)return;
      if(event.data.state==='close')close();
      if(event.data.state==='ready'){clearTimeout(timeout);setStatus('ready');}
      if(event.data.state==='error'){clearTimeout(timeout);setStatus('error');}
    }
    window.addEventListener('message',receive);
    return()=>{clearTimeout(timeout);window.removeEventListener('message',receive);};
  },[session]);
  useEffect(()=>{if(status==='error')setSession(null);},[status]);
  useEffect(()=>{if(status==='error'&&!session)activation.current?.focus();},[status,session]);
  return <>
    <button ref={launcher} className="libras-launcher" type="button" aria-label="Libras para navegação" aria-haspopup="dialog" aria-expanded={opened} aria-controls="navigation-libras" onClick={()=>{dialog.current?.showModal();setOpened(true);}}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 13V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2 7-6 7h-2c-2 0-3-1-5-3l-4-5a1.5 1.5 0 0 1 2-2l3 2"/></svg><span>Libras</span>
    </button>
    <dialog id="navigation-libras" ref={dialog} className="libras-dialog" aria-labelledby="libras-title" aria-describedby="libras-description" onClose={()=>{setOpened(false);setSession(null);setStatus('idle');launcher.current?.focus();}}>
      <header className="libras-header"><h2 id="libras-title">Libras para navegação</h2><button className="button button-outline" type="button" autoFocus onClick={close}>Fechar Libras</button></header>
      <div className="libras-body">
        <p id="libras-description">Consulte em Libras os nomes dos menus e orientações para usar o Travessia. Este guia não inclui materiais, atividades ou dados da sua conta.</p>
        {!session&&<><p>Ao ativar, seu navegador carrega o serviço externo VLibras. Somente os textos fixos deste guia ficam disponíveis para tradução.</p><p className="small"><a href="https://www.vlibras.gov.br/privacy.html" target="_blank" rel="noopener noreferrer">Termos e privacidade do VLibras</a>. Tradução automática, sujeita a imprecisões.</p></>}
        {status==='loading'&&<p role="status">Carregando o botão do VLibras… O avatar será carregado ao ativar o botão azul dentro do guia.</p>}
        {status==='ready'&&<p role="status">Guia disponível. Ative o botão azul do VLibras e selecione uma orientação.</p>}
        {status==='error'&&<p role="alert">Não foi possível carregar ou usar o VLibras. O serviço externo pode estar indisponível. Você pode tentar novamente ou continuar usando a plataforma.</p>}
        {!session&&<button ref={activation} type="button" className="button" onClick={activate}>{status==='error'?'Tentar carregar VLibras novamente':'Ativar VLibras'}</button>}
        {session&&<iframe key={session.token} ref={frame} className="libras-frame" title="Guia de navegação com VLibras" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={session.document}/>}
      </div>
      <footer className="libras-footer"><button type="button" className="text-button" onClick={close}>Fechar e voltar à plataforma</button></footer>
    </dialog>
  </>;
}
