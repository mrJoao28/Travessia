"use client";
import Link from 'next/link';
import { FirstStepsGuide } from './first-steps-guide';

export function TeacherFirstSteps({classroomId,draftId,onInvite}:{classroomId:string;draftId?:string;onInvite:()=>void}){
 return <FirstStepsGuide title="Primeiros passos da sua turma" steps={[
  {title:'Convide seus alunos',detail:'Compartilhe o link, o código curto ou uma mensagem por e-mail. Você também pode preparar a missão antes de enviar os convites.',action:<button type="button" className="button button-outline" onClick={onInvite}>Convidar alunos</button>},
  {title:'Prepare a primeira missão',detail:'Defina objetivos e etapas, adicione o PDF e escolha os apoios para cada aluno. Compare o original com o preparado e revise antes de publicar.',action:<Link className="button" href={draftId?`/professor/missoes/${draftId}/editar`:`/professor/missoes/nova?turma=${encodeURIComponent(classroomId)}`}>{draftId?'Continuar o rascunho':'Criar primeira missão'}</Link>},
  {title:'Acompanhe as respostas',detail:'Em Entregas, consulte o que os alunos enviaram e escreva uma devolutiva sobre o próximo passo.',action:<Link className="text-link" href={`/professor/entregas?turma=${encodeURIComponent(classroomId)}`}>Conhecer a área de entregas</Link>},
 ]}/>;
}
