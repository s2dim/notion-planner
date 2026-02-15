import { NextResponse } from "next/server";
import { notion, NOTION_TASKS_DB_ID } from "@/lib/notion";

type Slot = "morning" | "afternoon" | "evening";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json()) as {
    completed?: boolean;
    date?: string;
    timeSlot?: Slot;
    order?: number | null;
    text?: string;
  };

  const props: any = {};
  if (typeof body.completed === "boolean") {
    props.Done = { checkbox: !!body.completed };
  }
  if (typeof body.date === "string" && body.date) {
    props.Date = { date: { start: body.date } };
  }
  if (typeof body.timeSlot === "string" && body.timeSlot) {
    props.Slot = { select: { name: body.timeSlot } };
  }
  if (typeof body.text === "string") {
    const name = body.text.trim();
    if (name) {
      props.Name = { title: [{ text: { content: name } }] };
    }
  }

  if (body.order !== undefined) {
    try {
      const db = await notion.databases.retrieve({
        database_id: NOTION_TASKS_DB_ID,
      });
      if ((db as any).properties?.Order?.number !== undefined) {
        props.Order = { number: body.order };
      }
    } catch {
      // ignore schema check errors
    }
  }

  if (Object.keys(props).length > 0) {
    await notion.pages.update({
      page_id: params.id,
      properties: props,
    } as any);
  }

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
