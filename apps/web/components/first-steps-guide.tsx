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

export function StudentFirstSteps({ missionHref, preview = false }: { missionHref?: string; preview?: boolean }) {
  return <FirstStepsGuide title={preview?"Primeiros passos do aluno":"Sua primeira atividade está pronta"} steps={[
    { title:"Abra a atividade e os materiais", detail:"Confira o objetivo e os critérios. Abra o PDF da turma e os apoios preparados pelo professor, quando estiverem disponíveis.", action:missionHref?<Link className="button" href={missionHref}>Abrir atividade</Link>:undefined },
    { title:"Faça uma etapa por vez", detail:"Consulte as instruções e os exemplos, marque as etapas concluídas e salve o rascunho para retomar de onde parou. Para registrar o que ajuda você a aprender, abra Meus apoios no menu." },
    { title:"Envie e acompanhe a devolutiva", detail:"Revise o que escreveu e envie no formato permitido. Depois, abra Entregas no menu para acompanhar o feedback do professor." },
  ]}/>;
}
