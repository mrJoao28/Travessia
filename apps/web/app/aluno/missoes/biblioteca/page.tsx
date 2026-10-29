import { redirect } from "next/navigation";
// A former mock route cannot silently become a private mission or a preview.
export default function MissionPage() {
  redirect("/aluno");
}
