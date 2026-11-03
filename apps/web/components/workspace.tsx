"use client";
import {useEffect,useId,useState} from "react";
import {NavigationHint} from "./navigation-hint";
import Link from "next/link";
import { ReadingPreferences } from "./reading-preferences";
import { ThemeImage } from "./theme-image";
import { Brand, Icon, type IconName } from "./icons";
import { NavLink } from "./nav-link";
import type { ApiResponse } from "../lib/product-client";
import { AccountMenu, type AccountView } from "./account-menu";

export function Workspace({
  role,
  children,
  preview = false,
  preferences,
  account,
}: {
  role: "aluno" | "professor";
  children: React.ReactNode;
  preview?: boolean;
  preferences?: ApiResponse<"preferences">;
  account?: AccountView;
}) {
  const [collapsed,setCollapsed]=useState(false),[ready,setReady]=useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const sidebarId=useId();
  useEffect(()=>{try{setCollapsed(localStorage.getItem('travessia:sidebar:v1')==='collapsed');}catch{}setReady(true);},[]);
  useEffect(()=>{if(ready)try{localStorage.setItem('travessia:sidebar:v1',collapsed?'collapsed':'expanded');}catch{}},[collapsed,ready]);
  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setTheme(root.dataset.theme === "dark" ? "dark" : "light");
    const observer = new MutationObserver(syncTheme);
    syncTheme();
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  const toggleLabel=collapsed?'Abrir menu':'Recolher menu';
  const base = preview ? "/previa" : "";
  const student = role === "aluno";
  const links: [string, string, IconName][] = student
    ? [
        [`${base}/aluno`, "Meu percurso", "book"],
        [`${base}/aluno/turmas`, "Minhas turmas", "users"],
        [`${base}/aluno/entregas`, "Entregas", "document"],
        [`${base}/aluno/feedback`, "Feedback", "message"],
        [`${base}/aluno/apoios`, "Meus apoios", "message"],
      ]
    : [
        [`${base}/professor`, "Minhas turmas", "users"],
        [`${base}/professor/missoes`, "Missões", "book"],
        [`${base}/professor/entregas`, "Entregas", "document"],
        ...(preview ? [[`${base}/professor/barreiras`, "Apoios e barreiras", "message"] as [string,string,IconName]] : []),
      ];
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className={`shell${student ? "" : " teacher-shell"}${collapsed ? " is-sidebar-collapsed" : ""}`}>
        <aside className="sidebar" id={sidebarId} aria-label="Menu lateral">
          <Link
            className="brand"
            href={`${base}/${role}`}
            aria-label="Travessia, início"
          >
            <Brand />
          </Link>
          <nav aria-label="Navegação principal">
            <ul>
              {links.map(([href, label, icon]) => (
                <li key={href}>
                  <NavLink href={href} label={label} icon={icon} compact={collapsed} />
                </li>
              ))}
            </ul>
          </nav>
          <div className="sidebar-tools">
            <NavigationHint label="Preferências de leitura" enabled={collapsed}><a href="#preferencias" aria-label="Preferências de leitura">
              <Icon name="settings" /><span className="sidebar-label">Preferências de leitura</span>
            </a></NavigationHint>
            <NavigationHint label="Tema e contraste" enabled={collapsed}><a href="#temas" aria-label="Tema e contraste">
              <Icon name={theme === "dark" ? "moon" : "sun"} /><span className="sidebar-label">Tema e contraste</span>
            </a></NavigationHint>
            <NavigationHint label="Ajuda" enabled={collapsed}><Link href={`${base}/${role}/ajuda`} aria-label="Ajuda">
              <Icon name="help" /><span className="sidebar-label">Ajuda</span>
            </Link></NavigationHint>
          </div>
          <div className="network-brand">
            <span>Uma iniciativa</span>
            <ThemeImage
              lightSrc="/brand/mais-acesso-conecta.png"
              darkSrc="/brand/mais-acesso-conecta-dark.png"
              width={160}
              height={80}
              alt="Mais Acesso Conecta"
            />
            <p>Conectando pessoas e possibilidades de aprender.</p>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="workspace-topbar-start"><NavigationHint label={toggleLabel} below>
              <button type="button" className="sidebar-toggle" aria-label={toggleLabel} aria-expanded={!collapsed} aria-controls={sidebarId} disabled={!ready} onClick={()=>setCollapsed(v=>!v)}><Icon name={collapsed?'panel-open':'panel-close'}/></button>
            </NavigationHint><span className="eyebrow workspace-context">ÁREA {student ? "DO ALUNO" : "DO PROFESSOR"}</span></div>
            <div className="topbar-actions">
              <ReadingPreferences accountPreferences={preferences} />
              <AccountMenu
                account={account}
                preview={preview}
                student={student}
              />
            </div>
          </header>
          <main id="conteudo" tabIndex={-1}>
            {children}
          </main>
          <footer className="footer">
            {preview
              ? "Prévia de interface · dados fictícios · alterações não são salvas no banco"
              : "Travessia · Aprendizagem por missões"}
          </footer>
        </div>
      </div>
    </>
  );
}

/** Decorative artwork; learning information stays in semantic HTML. */
export function PathIllustration({
  variant = "student",
}: {
  variant?: "student" | "teacher";
}) {
  return (
    <figure className="path-art decorative" aria-hidden="true">
      <ThemeImage
        lightSrc={
          variant === "teacher"
            ? "/brand/teaching-pathways.webp"
            : "/brand/learning-together.webp"
        }
        darkSrc={
          variant === "teacher"
            ? "/brand/teaching-pathways-dark.webp"
            : "/brand/learning-together-dark.webp"
        }
        width={1536}
        height={1024}
        sizes="(max-width: 1100px) 1px, 38vw"
        alt=""
      />
    </figure>
  );
}
