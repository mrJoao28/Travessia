export type ClassroomQuery = Promise<{
  turma?: string | string[];
  atividade?: string | string[];
}>;
export async function requestedClassroom(query: ClassroomQuery) {
  const { turma } = await query;
  return typeof turma === "string" ? turma : undefined;
}

export async function requestedActivity(query: ClassroomQuery) {
  const { atividade } = await query;
  return typeof atividade === "string" ? atividade : undefined;
}
