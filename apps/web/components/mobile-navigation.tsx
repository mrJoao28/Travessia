"use client";
import {useEffect,useId,useRef} from "react";
import Link from "next/link";
import {NavLink} from "./nav-link";
import {ReadingPreferences} from "./reading-preferences";
import type {IconName} from "./icons";
import type {ApiResponse} from "../lib/product-client";

export function MobileNavigation({open,onClose,role,links,helpHref,preferences}:{
 open:boolean;onClose:()=>void;role:"aluno"|"professor";
 links:[string,string,IconName][];helpHref:string;preferences?:ApiResponse<"preferences">;
}){
 const dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const titleId=useId();
 useEffect(()=>{
  const node=dialog.current;
  if(!node)return;
  if(open&&!node.open){
   node.showModal();
   const hash=window.location.hash;
   const target=hash==="#preferencias"||hash==="#temas"?node.querySelector<HTMLElement>(hash+" > summary"):null;
   (target??closeButton.current)?.focus();
  }else if(!open&&node.open)node.close();
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow="hidden";
  return()=>{document.body.style.overflow=previous;};
 },[open]);
 return <dialog ref={dialog} className="mobile-navigation" id="mobile-workspace-navigation"
  aria-labelledby={titleId}
  onKeyDown={event=>{
   if(event.key!=="Tab")return;
   const targets=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter(node=>{
    if(!node.getClientRects().length||getComputedStyle(node).visibility==="hidden")return false;
    for(let parent=node.parentElement;parent;parent=parent.parentElement){
     if(parent instanceof HTMLDetailsElement&&!parent.open&&!parent.querySelector(":scope > summary")?.contains(node))return false;
    }
    return true;
   });
   const first=targets[0],last=targets[targets.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }}
  onCancel={event=>{event.preventDefault();onClose();}} onClose={onClose}
  onClick={event=>{
   if(event.target!==event.currentTarget)return;
   const rect=event.currentTarget.getBoundingClientRect();
   if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();
  }}>
  <header className="mobile-navigation-heading"><h2 id={titleId}>Menu</h2>
   <button ref={closeButton} type="button" className="mobile-navigation-close" onClick={onClose} aria-label="Fechar menu">Fechar <span aria-hidden="true">×</span></button>
  </header>
  <div className="mobile-navigation-content">
   <p className="small mobile-navigation-context">Área {role==="aluno"?"do aluno":"do professor"}</p>
   <nav aria-label="Navegação principal" onClick={event=>{if(event.target instanceof Element&&event.target.closest("a[href]"))onClose();}}>
    <ul>{links.map(([href,label,icon])=><li key={href}><NavLink href={href} label={label} icon={icon}/></li>)}</ul>
   </nav>
   <section className="mobile-navigation-settings" aria-label="Leitura e aparência">
    <h3>Leitura e aparência</h3><ReadingPreferences accountPreferences={preferences}/>
   </section>
   <Link className="mobile-navigation-help" href={helpHref} onClick={onClose}>Ajuda e orientações</Link>
  </div>
 </dialog>;
}
