import { UserList } from "../users/user-list";

export const metadata = { title: "Élèves" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  return <UserList role="student" searchParams={await searchParams} />;
}
