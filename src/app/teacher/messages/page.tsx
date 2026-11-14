import { Inbox } from "@/components/messages/inbox";

export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const { with: withId } = await searchParams;
  return <Inbox space="teacher" withId={withId} />;
}
