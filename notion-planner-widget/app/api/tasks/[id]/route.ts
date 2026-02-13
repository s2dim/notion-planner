import { NextResponse } from "next/server";
import { notion, NOTION_TASKS_DB_ID } from "@/lib/notion";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { completed } = (await req.json()) as { completed: boolean };

  await notion.pages.update({
    page_id: params.id,
    properties: {
      Done: { checkbox: !!completed },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  await notion.pages.update({
    page_id: params.id,
    archived: true,
  });

  return NextResponse.json({ ok: true });
}
