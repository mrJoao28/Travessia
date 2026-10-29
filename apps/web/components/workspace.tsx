import Link from "next/link";
import { ReadingPreferences } from "./reading-preferences";
import { Brand, Icon, type IconName } from "./icons";
import { NavLink } from "./nav-link";
import type { ApiResponse } from "../lib/product-client";
import { AccountMenu, type AccountView } from "./account-menu";

export function Workspace({
  role,
  children,
  preview = true,
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
      ]
    : [
        [`${base}/professor`, "Visão da turma", "users"],
        [`${base}/professor/missoes`, "Missões", "book"],
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
          <div className="sidebar-landscape decorative" aria-hidden="true">
            <svg viewBox="0 0 280 290" preserveAspectRatio="none">
              <path
                d="M0 20C90 15 160 150 280 120v29C150 126 90 41 0 101Z"
                fill="var(--gold)"
              />
              <path
                d="M0 260c140-36 210-100 280-110v140H0Z"
                fill="var(--primary)"
              />
            </svg>
            <p>
              CONHECIMENTO
              <br />
              TAMBÉM
              <br />É CAMINHO.
            </p>
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

// Arte vetorial provisória, substituível pela arte final do usuário.
export function PathIllustration() {
  return (
    <figure className="path-art decorative">
      <svg viewBox="0 0 560 370" aria-hidden="true">
        <circle cx="331" cy="50" r="30" fill="var(--gold)" />
        <path
          d="M0 145Q87 68 216 124T394 113Q462 80 560 107V370H0Z"
          fill="var(--sage)"
        />
        <path d="M0 122Q84 88 174 132T360 146T560 127v243H0Z" fill="#F2E7D3" />
        <path
          d="M65 370C17 275 431 321 350 236S207 212 423 156 414 123 466 120"
          fill="none"
          stroke="var(--surface)"
          strokeWidth="42"
        />
        <path
          d="M105 370C65 285 435 309 365 240S254 212 443 159 425 133 479 125"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="12"
        />
        <g stroke="var(--primary)" strokeWidth="2">
          <path d="M37 83h32v147H37Z" fill="var(--primary)" />
          <path d="M70 94h24v136H70Z" fill="var(--gold)" />
          <path
            d="M96 54h35v176H96Z"
            fill="var(--terracotta)"
            stroke="var(--terracotta)"
          />
          <path
            d="M135 67h25v163h-25Zm29 3h25v160h-25Z"
            fill="var(--surface)"
          />
          <path d="M194 76h22v154h-22Z" fill="var(--primary)" />
        </g>
        <g fill="#D5C2A5">
          <ellipse cx="164" cy="302" rx="60" ry="22" />
          <ellipse cx="256" cy="259" rx="53" ry="19" />
          <ellipse cx="350" cy="222" rx="45" ry="16" />
          <ellipse cx="428" cy="181" rx="38" ry="14" />
        </g>
        <g fill="#F1E2C7">
          <ellipse cx="164" cy="293" rx="60" ry="22" />
          <ellipse cx="350" cy="214" rx="45" ry="16" />
          <ellipse cx="428" cy="173" rx="38" ry="14" />
        </g>
        <ellipse cx="256" cy="251" rx="53" ry="19" fill="var(--terracotta)" />
        <g
          fontSize="23"
          fontFamily="sans-serif"
          textAnchor="middle"
          fill="var(--text)"
        >
          <text x="164" y="301">
            1
          </text>
          <text x="256" y="259" fill="white">
            2
          </text>
          <text x="350" y="222">
            4
          </text>
          <text x="428" y="181">
            5
          </text>
        </g>
        <g fill="var(--primary)">
          <path d="M0 370V228q47 2 50 54-29-11-34-30 36 24 49 81-6-81 34-108 15 56-23 100 31-31 63-20-12 42-68 45l10 20ZM422 370q-35-30-22-70 30 9 35 50-1-61 35-79 21 43-12 83 41-47 84-37-10 38-51 53ZM487 100q-40-12-42-44 35 1 42 29-5-40 17-57 9 42-10 62 13-18 35-17-3 22-35 29Z" />
        </g>
      </svg>
      <figcaption>Arte provisória</figcaption>
    </figure>
  );
}
