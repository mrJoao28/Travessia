import Link from "next/link";
import { ClassroomMembers } from "./classroom-tools";
import { Icon } from "./icons";
import type { Classroom, MissionEntry } from "./live-workspace";
import monitoriaStyles from "./monitoria-panel.module.css";

export function MonitorDashboard({ classroom, entries }: { classroom: Classroom; entries: MissionEntry[] }) {
  const activeMissions = entries.filter(({ mission }) => mission.status !== "archived");
  const submissions = entries.flatMap(entry => entry.submissions);
  const awaitingReview = submissions.filter(item => item.status === "submitted").length;
  return (
    <section className={monitoriaStyles.panel} aria-labelledby="monitoria-title">
      <header className={monitoriaStyles.hero}>
        <div className={monitoriaStyles.heroCopy}>
          <h2 id="monitoria-title">{classroom.name}</h2>
          <p>Você atua como monitor nesta turma.</p>
          <Link className={monitoriaStyles.createAction} href={`/professor/atividades/nova?turma=${encodeURIComponent(classroom.id)}`}>Criar atividade</Link>
        </div>
      </header>

      <nav className={monitoriaStyles.actions} aria-label={`Ações da turma ${classroom.name}`}>
        <Link className={monitoriaStyles.primaryAction} href={`/professor/entregas?turma=${encodeURIComponent(classroom.id)}`}>
          <span className={monitoriaStyles.actionIcon} aria-hidden="true"><Icon name="document" /></span>
          <span><strong>Acompanhar entregas</strong><small>{awaitingReview ? `${awaitingReview} aguardando feedback` : "Consultar entregas da turma"}</small></span>
        </Link>
        <Link className={monitoriaStyles.action} href={`/professor/atividades?turma=${encodeURIComponent(classroom.id)}`}>
          <span className={monitoriaStyles.actionIcon} aria-hidden="true"><Icon name="book" /></span>
          <span><strong>Ver atividades</strong><small>{activeMissions.length ? `${activeMissions.length} ${activeMissions.length === 1 ? "atividade ativa" : "atividades ativas"}` : "Consultar atividades"}</small></span>
        </Link>
        <Link className={monitoriaStyles.action} href={`/professor/barreiras?turma=${encodeURIComponent(classroom.id)}`}>
          <span className={monitoriaStyles.actionIcon} aria-hidden="true"><Icon name="message" /></span>
          <span><strong>Apoios e barreiras</strong><small>Consultar relatos compartilhados</small></span>
        </Link>
      </nav>

      <h3 className={monitoriaStyles.sectionHeading}>Atividades em andamento</h3>
      {activeMissions.length ? <ul className={monitoriaStyles.missions}>
        {activeMissions.map(({ mission }) => <li key={mission.id}>
          <div className={monitoriaStyles.missionText}>
            <span className={mission.status === "draft" ? monitoriaStyles.draftStatus : monitoriaStyles.publishedStatus}>{mission.status === "draft" ? "Rascunho" : "Publicada"}</span>
            <h4>{(mission.draftVersion ?? mission.publishedVersion)?.title ?? "Atividade sem título"}</h4>
            {mission.draftVersion?.source === "demo_fixture" && <p>Rascunho fictício da demonstração.</p>}
            {mission.draftVersion && <p>Há uma versão de rascunho disponível para revisão.</p>}
          </div>
          <div className={monitoriaStyles.missionActions} role="group" aria-label={`Ações para ${(mission.draftVersion ?? mission.publishedVersion)?.title ?? "atividade"} na turma ${classroom.name}`}>
            <Link className={monitoriaStyles.missionPrimaryLink} href={`/professor/atividades/${mission.id}/editar`}>Abrir atividade</Link>
            <Link className={monitoriaStyles.missionLink} href={`/professor/atividades/${mission.id}/apoios`}>Configurar materiais e apoios</Link>
            <Link className={monitoriaStyles.missionLink} href={`/professor/entregas?atividade=${encodeURIComponent(mission.id)}&turma=${encodeURIComponent(classroom.id)}`}>
              Ver entregas da atividade
            </Link>
          </div>
        </li>)}
      </ul> : <p className={monitoriaStyles.empty}>Nenhuma atividade em andamento nesta turma.</p>}

      <details className={monitoriaStyles.members}>
        <summary>Alunos da turma e convites</summary>
        <ClassroomMembers classroom={classroom} />
      </details>
    </section>
  );
}
