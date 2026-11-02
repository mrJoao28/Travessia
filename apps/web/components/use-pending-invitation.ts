"use client";
import {useEffect,useState} from 'react';
import {normalizeInvitation} from '../lib/invitation';
const key='travessia:pending-invitation';
export function usePendingInvitation(){
 const [invitation,setInvitation]=useState<string|null>(null);
 useEffect(()=>{
  function sync(navigated=false){
   const fragment=new URLSearchParams(window.location.hash.slice(1)).get('convite');
   let stored:string|null=null;try{stored=sessionStorage.getItem(key);}catch{/* Fragment still supports navigation if storage is blocked. */}
   const token=normalizeInvitation(fragment??(navigated?'':stored)??'',window.location.origin);
   setInvitation(token);
   try{if(token)sessionStorage.setItem(key,token);else sessionStorage.removeItem(key);}catch{}
  }
  sync();const onNavigation=()=>sync(true),onRestore=()=>sync();
  window.addEventListener('hashchange',onNavigation);window.addEventListener('popstate',onNavigation);window.addEventListener('pageshow',onRestore);
  return()=>{window.removeEventListener('hashchange',onNavigation);window.removeEventListener('popstate',onNavigation);window.removeEventListener('pageshow',onRestore);};
 },[]);
 function clearInvitation(){setInvitation(null);try{sessionStorage.removeItem(key);}catch{}window.history.replaceState(null,'',window.location.pathname+window.location.search);}
 return{invitation,clearInvitation};
}
