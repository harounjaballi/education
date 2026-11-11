import { UserList } from "../users/user-list";

export const metadata = { title: "Enseignants" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  return <UserList role="teacher" searchParams={await searchParams} />;
}
