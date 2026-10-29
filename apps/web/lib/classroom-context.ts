export type ClassroomQuery = Promise<{ turma?: string | string[] }>;
export async function requestedClassroom(query: ClassroomQuery) {
  const { turma } = await query;
  return typeof turma === "string" ? turma : undefined;
}
