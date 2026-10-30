import Image from "next/image";
import Link from "next/link";
import { ReadingPreferences } from "./reading-preferences";
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
  const base = preview ? "/previa" : "";
  const student = role === "aluno";
  const links: [string, string, IconName][] = student
    ? [
        [`${base}/aluno`, "Meu percurso", "book"],
        [`${base}/aluno/turmas`, "Minhas turmas", "users"],
        [`${base}/aluno/entregas`, "Entregas", "document"],
        [`${base}/aluno/feedback`, "Feedback", "message"],
        ...(!preview ? [["/aluno/apoios", "Meus apoios", "message"] as [string, string, IconName]] : []),
      ]
    : [
        [`${base}/professor`, "Visão da turma", "users"],
        ...(!preview
          ? [
              [`${base}/professor/turmas`, "Minhas turmas", "users"] as [
                string,
                string,
                IconName,
              ],
            ]
          : []),
        [`${base}/professor/missoes`, "Missões", "book"],
        ...(!preview ? [["/professor/estrategias", "Estratégias", "list"] as [string, string, IconName]] : []),
        ...(!preview ? [["/professor/adaptacoes", "Adaptações", "document"] as [string, string, IconName]] : []),
        [`${base}/professor/entregas`, "Entregas", "document"],
        [`${base}/professor/barreiras`, "Apoios e barreiras", "message"],
      ];
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="shell">
        <aside className="sidebar">
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
                  <NavLink href={href} label={label} icon={icon} />
                </li>
              ))}
            </ul>
          </nav>
          <div className="sidebar-tools">
            <a href="#preferencias">
              <Icon name="settings" />
              Preferências de leitura
            </a>
            <Link href={`${base}/${role}/ajuda`}>
              <Icon name="help" />
              Ajuda
            </Link>
          </div>
          <div className="network-brand">
            <span>Uma iniciativa</span>
            <Image
              src="/brand/mais-acesso-conecta.png"
              width={160}
              height={80}
              alt="Mais Acesso Conecta"
            />
            <p>Conectando pessoas e possibilidades de aprender.</p>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <span className="eyebrow">
              ÁREA {student ? "DO ALUNO" : "DO PROFESSOR"}
            </span>
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
      <Image
        src={
          variant === "teacher"
            ? "/brand/teaching-pathways.webp"
            : "/brand/learning-together.webp"
        }
        width={1536}
        height={1024}
        sizes="(max-width: 1100px) 1px, 38vw"
        alt=""
      />
    </figure>
  );
}
