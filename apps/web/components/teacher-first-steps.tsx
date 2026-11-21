"use client";
import Link from 'next/link';
import { FirstStepsGuide } from './first-steps-guide';

export function TeacherFirstSteps({classroomId,draftId}:{classroomId:string;draftId?:string}){
 return <FirstStepsGuide title="Primeiros passos da sua turma" steps={[
  {title:'Convide seus alunos',detail:'Abra “Alunos da turma e convites” nesta página para compartilhar o link, o código curto ou uma mensagem por e-mail. Você também pode preparar a atividade antes de enviar os convites.'},
  {title:'Prepare a primeira atividade',detail:'Defina objetivos e etapas, adicione o PDF e escolha os apoios para cada aluno. Compare o original com o preparado e revise antes de publicar.',action:<Link className="button" href={draftId?`/professor/atividades/${draftId}/editar`:`/professor/atividades/nova?turma=${encodeURIComponent(classroomId)}`}>{draftId?'Continuar o rascunho':'Criar primeira atividade'}</Link>},
  {title:'Acompanhe as respostas',detail:'Abra Entregas no menu para consultar o que os alunos enviaram e escrever uma devolutiva sobre o próximo passo.'},
 ]}/>;
}
