import { UserDetail } from "../../users/user-detail";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  return <UserDetail role="teacher" id={id} ok={ok} />;
}
