import Link from "next/link";
import { FirstStepsGuide, StudentFirstSteps } from "../first-steps-guide";
import { PreviewHeading } from "./chrome";

export function PreviewFirstSteps({ role }: { role: "aluno" | "professor" }) {
  return <>
    <PreviewHeading title="Conheça o Travessia na prática" description="Experimente o percurso com dados fictícios neste navegador."/>
    {role==="aluno"?<StudentFirstSteps preview missionHref="/previa/aluno/missoes/campus"/>:
      <FirstStepsGuide title="Primeiros passos do professor" steps={[
        {title:"Conheça sua turma",detail:"Explore a Oficina de Projetos Inclusivos e experimente um código de convite fictício.",action:<Link className="button button-outline" href="/previa/professor/turmas">Abrir turmas</Link>},
        {title:"Prepare uma missão",detail:"Use um PDF de exemplo, escolha um aluno e compare Original e Preparado. Revise o material antes de disponibilizá-lo e publique a missão.",action:<div className="actions"><Link className="button" href="/previa/professor/missoes/editor">Abrir editor de exemplo</Link><Link className="text-link" href="/previa/professor/missoes/campus/adaptacoes">Experimentar os apoios</Link></div>},
        {title:"Acompanhe as entregas",detail:"Abra uma resposta já enviada e experimente registrar feedback. Depois, mude para o espaço do aluno para conferi-lo.",action:<Link className="text-link" href="/previa/professor/entregas">Consultar entregas de exemplo</Link>},
      ]}/>
    }
  </>;
}
