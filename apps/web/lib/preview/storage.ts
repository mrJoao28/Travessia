import { initialPreview, type PreviewState } from './data';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const str=(v:unknown,max=20000):v is string=>typeof v==='string'&&v.length<=max;
const strings=(v:unknown,max=20)=>Array.isArray(v)&&v.length<=max&&v.every(x=>str(x,300));
const integer=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=1000;
const rows=(v:unknown,max:number,fn:(r:Record<string,unknown>)=>boolean)=>Array.isArray(v)&&v.length<=max&&v.every(r=>obj(r)&&fn(r));
const enumOf=(v:unknown,options:string[])=>typeof v==='string'&&options.includes(v);
const missionBody=(r:Record<string,unknown>)=>['id','classroomId','title','description','objectives','criteria'].every(k=>str(r[k],6000))&&integer(r.revision)&&enumOf(r.source,['campus','biblioteca','energia'])&&Array.isArray(r.steps)&&r.steps.length>0&&rows(r.steps,10,t=>str(t.title,200)&&str(t.instructions,6000)&&str(t.example,3000));
export function parsePreview(raw:string|null):PreviewState{
 if(!raw||raw.length>1000000)return initialPreview();
 try{
  const s:unknown=JSON.parse(raw);if(!obj(s)||s.version!==1||!str(s.studentId,100)||!obj(s.teacher)||!['name','subject','course'].every(k=>str(s.teacher&&((s.teacher as Record<string,unknown>)[k]),300)))return initialPreview();
  if(!rows(s.students,12,r=>str(r.id,100)&&str(r.name,120)&&str(r.course,200)&&str(r.period,80)&&strings(r.disabilities,10)&&strings(r.supports,12)&&typeof r.shareNeeds==='boolean'&&typeof r.shareDisability==='boolean'))return initialPreview();
  if(!rows(s.classrooms,10,r=>str(r.id,100)&&str(r.name,150)&&str(r.subject,150)&&strings(r.students,12)&&(r.invitation===null||str(r.invitation,100))))return initialPreview();
  if(!rows(s.missions,20,r=>missionBody(r)&&enumOf(r.status,['draft','published','archived'])&&(r.publishedVersion===undefined||(obj(r.publishedVersion)&&missionBody(r.publishedVersion)))))return initialPreview();
  if(!rows(s.materials,60,r=>['id','missionId','studentId'].every(k=>str(r[k],100))&&integer(r.revision)&&enumOf(r.source,['campus','biblioteca','energia'])&&enumOf(r.preset,['original','expanded','clear','glossary','description'])&&typeof r.audio==='boolean'&&typeof r.released==='boolean'&&str(r.instructions,6000)&&strings(r.formats,3)&&(r.formats as string[]).every(f=>['text','audio','text_file'].includes(f))))return initialPreview();
  if(!rows(s.submissions,100,r=>['id','missionId','studentId'].every(k=>str(r[k],100))&&integer(r.revision)&&str(r.content)&&Array.isArray(r.completed)&&r.completed.length<=10&&r.completed.every(integer)&&integer(r.step)&&enumOf(r.status,['draft','submitted'])&&typeof r.audio==='boolean'&&typeof r.textFile==='boolean'&&str(r.feedback,10000)))return initialPreview();
  if(!rows(s.reports,60,r=>['id','missionId','studentId'].every(k=>str(r[k],100))&&str(r.content,3000)&&typeof r.shared==='boolean'&&str(r.reply,3000)))return initialPreview();
  if(!rows(s.strategies,60,r=>str(r.id,100)&&str(r.missionId,100)&&integer(r.revision)&&(r.studentId===null||str(r.studentId,100))&&(r.step===null||integer(r.step))&&str(r.title,200)&&str(r.content,6000)))return initialPreview();
  const value=s as unknown as PreviewState;
  if(!value.students.some(x=>x.id===value.studentId)||!value.students.length||!value.classrooms.length||!value.missions.length)return initialPreview();
  return value;
 }catch{return initialPreview();}
}
