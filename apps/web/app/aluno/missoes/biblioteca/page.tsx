import Link from 'next/link';
import { Workspace } from '../../../../components/workspace';
import { DemoMission } from '../../../../components/demo-mission';

export default function MissionPage() {
  return <Workspace role="aluno"><div className="page-heading"><Link href="/aluno" className="text-link">← Voltar ao meu percurso</Link><h1>Uma etapa de cada vez.</h1><p>Conheça o formato de uma missão. Você pode consultar as etapas livremente.</p></div><DemoMission /></Workspace>;
}
