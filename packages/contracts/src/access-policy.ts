/** Núcleo de autorização: receba identidade validada e vínculos lidos do banco.
 * Não use claims, papéis ou vínculos enviados pelo navegador como fonte de verdade.
 * Este módulo não implementa autenticação nem substitui guards e filtros SQL.
 */
export type Actor = { id: string };
export type Membership = { userId: string; classroomId: string; role: 'teacher' | 'student' };
export type Resource = { classroomId: string; ownerId: string; sharedWithTeachers?: boolean };
export type Action = 'readPublishedMission' | 'manageMission' | 'readSubmission' | 'submitWork' | 'readBarrier';

export function canAccess(
  actor: Actor | null,
  memberships: readonly Membership[],
  action: Action,
  resource: Resource,
): boolean {
  if (!actor?.id || !resource.classroomId || !resource.ownerId) return false;
  const membership = memberships.find(m => m.userId === actor.id && m.classroomId === resource.classroomId);
  if (!membership) return false;
  switch (action) {
    case 'readPublishedMission': return true;
    case 'manageMission': return membership.role === 'teacher';
    case 'readSubmission': return membership.role === 'teacher' || resource.ownerId === actor.id;
    case 'submitWork': return membership.role === 'student' && resource.ownerId === actor.id;
    case 'readBarrier': return resource.ownerId === actor.id || (membership.role === 'teacher' && resource.sharedWithTeachers === true);
    default: return false;
  }
}
