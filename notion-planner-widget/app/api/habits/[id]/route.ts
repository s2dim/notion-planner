import { NextResponse } from "next/server";
import { notion } from "@/lib/notion-habits";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { active, order, name } = (await req.json()) as {
    active?: boolean;
    order?: number | null;
    name?: string;
  };

  await notion.pages.update({
    page_id: params.id,
    properties: {
      ...(typeof active === "boolean" ? { Active: { checkbox: !!active } } : {}),
      ...(order !== undefined
        ? { Order: { number: typeof order === "number" ? order : null } }
        : {}),
      ...(typeof name === "string" && name.trim()
        ? { Name: { title: [{ text: { content: name.trim() } }] } }
        : {}),
    },
  } as any);

  return NextResponse.json({ ok: true });
}
