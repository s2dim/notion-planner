import { NextResponse } from "next/server";
import { notion } from "@/lib/notion-habits";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { active } = (await req.json()) as { active: boolean };

  await notion.pages.update({
    page_id: params.id,
    properties: {
      Active: { checkbox: !!active },
    },
  } as any);

  return NextResponse.json({ ok: true });
}
