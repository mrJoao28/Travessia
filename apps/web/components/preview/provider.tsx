"use client";
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { initialPreview,PREVIEW_KEY,type PreviewState } from '../../lib/preview/data';
import { parsePreview } from '../../lib/preview/storage';
const Context=createContext<{state:PreviewState;update:(fn:(s:PreviewState)=>PreviewState)=>void;reset:()=>void;ready:boolean;storageWarning:boolean;epoch:number}|null>(null);
export function PreviewProvider({children}:{children:ReactNode}){
 const [state,setState]=useState(initialPreview),[ready,setReady]=useState(false),[storageWarning,setStorageWarning]=useState(false),[epoch,setEpoch]=useState(0);
 useEffect(()=>{try{setState(parsePreview(localStorage.getItem(PREVIEW_KEY)));}catch{setStorageWarning(true);}setReady(true);},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem(PREVIEW_KEY,JSON.stringify(state));}catch{setStorageWarning(true);}},[state,ready]);
 return <Context.Provider value={{state,update:fn=>setState(fn),reset:()=>{setState(initialPreview());setEpoch(v=>v+1);},ready,storageWarning,epoch}}>{children}</Context.Provider>;
}
export function usePreview(){const value=useContext(Context);if(!value)throw new Error('Contexto de prévia ausente.');return value;}
