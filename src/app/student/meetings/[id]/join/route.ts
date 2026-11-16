import { joinMeeting } from "@/lib/meetings-join";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return joinMeeting(request, id, "student");
}
