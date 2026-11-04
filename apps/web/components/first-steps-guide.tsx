import Link from "next/link";
import type { ReactNode } from "react";

type Step = { title: string; detail: string; action?: ReactNode };

export function FirstStepsGuide({ title, steps }: { title: string; steps: readonly Step[] }) {
  return <section className="paper onboarding-guide" aria-label={title}>
    <h2>{title}</h2>
    <ol className="onboarding-grid">
      {steps.map(({title,detail,action},index)=><li key={title}>
        <span className="onboarding-number" aria-hidden="true">{index+1}</span>
        <h3>{title}</h3><p>{detail}</p>{action}
      </li>)}
    </ol>
  </section>;
}

export function StudentFirstSteps({ missionHref, preview = false }: { missionHref: string; preview?: boolean }) {
  return <FirstStepsGuide title={preview?"Primeiros passos do aluno":"Sua primeira missão está pronta"} steps={[
    { title:"Abra a missão e os materiais", detail:"Confira o objetivo e os critérios. Em Materiais preparados para você, abra o PDF ou ouça o áudio, quando estiver disponível.", action:<Link className="button" href={missionHref}>Abrir missão</Link> },
    { title:"Faça uma etapa por vez", detail:"Consulte as instruções e os exemplos, marque as etapas concluídas e salve o rascunho para retomar de onde parou.", action:<Link className="text-link" href={preview?"/previa/aluno/apoios":"/aluno/apoios"}>Conhecer meus apoios</Link> },
    { title:"Envie e acompanhe a devolutiva", detail:"Revise o que escreveu e envie no formato permitido. Volte à missão para ler o feedback do professor." },
  ]}/>;
}
