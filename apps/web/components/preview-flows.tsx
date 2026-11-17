"use client";
import { usePreview } from './preview/provider';
import { PreviewChrome,PreviewHeading } from './preview/chrome';
import { PreviewHome } from './preview/home';
import { PreviewEditor } from './preview/editor';
import { PreviewMaterials } from './preview/materials';
import { PreviewStudentMission } from './preview/student-mission';
import { PreviewDeliveries,PreviewBarriers } from './preview/communications';
import { PreviewFirstSteps } from './preview/first-steps';
import { PreviewProfile } from './preview/profile';
export function PreviewFlows({role,route}:{role:'aluno'|'professor';route:string}){
 const {ready,state,epoch}=usePreview();
 if(!ready)return <p role="status">Preparando cenário fictício…</p>;
 const parts=route.split('/');
 let content;
 if(route==='primeiros-passos')content=<PreviewFirstSteps role={role}/>;
 else if(route==='ajuda')content=<><PreviewHeading title="Um apoio no caminho."/><section className="paper lesson-reader"><h2>Experimente o percurso completo</h2><p>Na área do professor, crie uma missão, escolha um PDF fictício, prepare um material para um aluno e revise antes de publicar. Na área do aluno, leia os materiais, salve o rascunho e envie a atividade. Volte ao professor para dar feedback.</p><h2>Ajustar leitura</h2><p>O botão no início da página permite ampliar o texto, mudar contraste e espaçamento sem informar diagnóstico.</p><h2>Uma simulação local</h2><p>Não há sessão real, chamadas de IA ou envio ao servidor nesta área. Use somente os exemplos fictícios. Você pode reiniciar o cenário a qualquer momento.</p></section></>;
 else if(route==='perfil'||route==='apoios')content=<PreviewProfile role={role} needsOnly={route==='apoios'} key={`${role}:${route}:${state.studentId}`}/>;
 else if(route==='entregas'||route==='feedback')content=<PreviewDeliveries role={role} feedbackOnly={route==='feedback'}/>;
 else if(route==='barreiras')content=<PreviewBarriers role={role} key={`${role}:${state.studentId}`}/>;
 else if(role==='professor'&&route==='missoes/editor')content=<PreviewEditor key="new"/>;
 else if(role==='professor'&&parts[0]==='missoes'&&parts.length===3)content=parts[2]==='editor'?<PreviewEditor missionId={parts[1]} key={parts[1]}/>:<PreviewMaterials missionId={parts[1]} key={parts[1]}/>;
 else if(role==='aluno'&&parts[0]==='missoes'&&parts[1])content=<PreviewStudentMission missionId={parts[1]} key={`${parts[1]}:${state.studentId}`}/>;
 else content=<PreviewHome role={role} route={route}/>;
 return <div className="interactive-preview" key={epoch}><PreviewChrome role={role}/>{content}</div>;
}
