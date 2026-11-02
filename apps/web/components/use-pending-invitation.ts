"use client";
import {useEffect,useState} from 'react';
import {normalizeInvitation} from '../lib/invitation';
const key='travessia:pending-invitation';
export function usePendingInvitation(){
 const [invitation,setInvitation]=useState<string|null>(null);
 useEffect(()=>{
  const fragment=new URLSearchParams(window.location.hash.slice(1)).get('convite');
  let stored:string|null=null;try{stored=sessionStorage.getItem(key);}catch{/* Fragment still supports navigation if storage is blocked. */}
  const token=normalizeInvitation(fragment??stored??'',window.location.origin);
  setInvitation(token);
  try{if(token)sessionStorage.setItem(key,token);else sessionStorage.removeItem(key);}catch{}
 },[]);
 function clearInvitation(){setInvitation(null);try{sessionStorage.removeItem(key);}catch{}window.history.replaceState(null,'',window.location.pathname+window.location.search);}
 return{invitation,clearInvitation};
}
