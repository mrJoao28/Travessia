"use client";
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** Visual labels supplement the permanent accessible names; they never capture focus. */
export function NavigationHint({label,enabled=true,below=false,children}:{label:string;enabled?:boolean;below?:boolean;children:ReactNode}){
 const anchor=useRef<HTMLSpanElement>(null),tip=useRef<HTMLSpanElement>(null);
 const pointer=useRef(false),focused=useRef(false),overTip=useRef(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [visible,setVisible]=useState(false),[position,setPosition]=useState({left:0,top:0});
 function cancelHide(){if(timer.current){clearTimeout(timer.current);timer.current=null;}}
 function show(){cancelHide();if(enabled)setVisible(true);}
 function scheduleHide(){cancelHide();timer.current=setTimeout(()=>{if(!pointer.current&&!focused.current&&!overTip.current)setVisible(false);},150);}
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 useEffect(()=>{if(!enabled){setVisible(false);overTip.current=false;pointer.current=false;focused.current=false;}},[enabled]);
 useLayoutEffect(()=>{
  if(!enabled||!visible)return;
  function place(){
   if(!anchor.current||!tip.current)return;
   const a=anchor.current.getBoundingClientRect(),t=tip.current.getBoundingClientRect();
   const vertical=below||window.innerWidth<=800;
   let left=vertical?a.left+(a.width-t.width)/2:a.right+8;
   let top=vertical?a.bottom+8:a.top+(a.height-t.height)/2;
   if(!vertical&&left+t.width>window.innerWidth-12)left=a.left-t.width-8;
   if(vertical&&top+t.height>window.innerHeight-12)top=a.top-t.height-8;
   setPosition({left:Math.max(12,Math.min(left,window.innerWidth-t.width-12)),top:Math.max(12,Math.min(top,window.innerHeight-t.height-12))});
  }
  function dismiss(event:KeyboardEvent){if(event.key==='Escape'){setVisible(false);overTip.current=false;}}
  const observer=new ResizeObserver(place);if(anchor.current)observer.observe(anchor.current);if(tip.current)observer.observe(tip.current);
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);window.addEventListener('keydown',dismiss);
  return()=>{observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);window.removeEventListener('keydown',dismiss);};
 },[visible,enabled,below,label]);
 return <span ref={anchor} className="navigation-hint" onPointerEnter={()=>{pointer.current=true;show();}} onPointerLeave={()=>{pointer.current=false;scheduleHide();}} onFocus={()=>{focused.current=true;show();}} onBlur={()=>{focused.current=false;scheduleHide();}}>
  {children}
  {enabled&&visible&&createPortal(<span ref={tip} role="tooltip" aria-hidden="true" className="navigation-tooltip" style={position} onPointerEnter={()=>{overTip.current=true;cancelHide();}} onPointerLeave={()=>{overTip.current=false;scheduleHide();}}>{label}</span>,document.body)}
 </span>;
}
