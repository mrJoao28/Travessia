export function sortStudentsByName<T extends { id: string; name: string }>(students: readonly T[]): T[] {
  return [...students].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }) || a.id.localeCompare(b.id),
  );
}
