import Link from "next/link";
import type { MissionEntry } from "./live-workspace";

export function MissionSupportHub({ entry }: { entry?: MissionEntry }) {
  if (!entry) return <section className="paper"><h2>Escolha uma missão</h2><Link className="text-link" href="/professor/missoes">Consultar minhas missões</Link></section>;
  const version = entry.mission.draftVersion ?? entry.mission.publishedVersion;
  return <div className="form-stack">
    <div className="teacher-mission-context"><Link className="text-link" href="/professor/missoes">← Minhas missões</Link><h2>{version?.title}</h2><p>{entry.classroom.name}</p></div>
    <p className="notice">{entry.mission.draftVersion ? "Você está preparando apoios para o rascunho. Eles só chegam aos alunos quando esta versão for publicada." : "Você está preparando apoios para a versão publicada. Eles chegam aos destinatários depois da sua revisão."}</p>
    <p>Escolha o que quer preparar. Os apoios só chegam aos alunos depois da sua revisão.</p>
    <div className="teacher-support-hub">
      <section className="paper"><p className="eyebrow">Instruções e entregas</p><h2>Adaptar a atividade</h2><p>Reescreva as instruções, acrescente um exemplo e escolha os formatos de resposta para a turma ou alunos selecionados.</p><Link className="button" href={`/professor/missoes/${entry.mission.id}/adaptacoes?versao=${version?.id}`}>Preparar adaptação</Link></section>
      <section className="paper"><p className="eyebrow">Materiais de apoio</p><h2>Oferecer uma ajuda extra</h2><p>Prepare checklists, exemplos comentados, glossários ou instruções em texto e áudio para uma etapa da missão.</p><Link className="text-link" href={`/professor/missoes/${entry.mission.id}/estrategias?versao=${version?.id}`}>Escolher materiais de apoio →</Link></section>
    </div>
    <p className="small">As escolhas são pedagógicas. Nenhum apoio é aplicado automaticamente a partir de uma deficiência.</p>
    <Link className="text-link" href="/professor/barreiras">Consultar pedidos e barreiras compartilhados</Link>
  </div>;
}
