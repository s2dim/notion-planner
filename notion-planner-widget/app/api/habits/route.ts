import { NextResponse } from "next/server";
import {
  notion,
  NOTION_HABITS_DATABASE_ID,
} from "@/lib/notion-habits";

export async function GET() {
  if (!NOTION_HABITS_DATABASE_ID) {
    return NextResponse.json(
      { error: "Missing NOTION_HABITS_DATABASE_ID" },
      { status: 500 },
    );
  }

  const result = await notion.databases.query({
    database_id: NOTION_HABITS_DATABASE_ID,
    filter: {
      property: "Active",
      checkbox: { equals: true },
    },
    sorts: [
      { property: "Order", direction: "ascending" },
      { property: "Name", direction: "ascending" },
    ],
  } as any);

  const habits = result.results.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text ?? "",
      active: !!props.Active?.checkbox,
      order:
        typeof props.Order?.number === "number" ? props.Order.number : null,
    };
  });

  return NextResponse.json({ habits });
}

export async function POST(req: Request) {
  const { name, order } = (await req.json()) as {
    name: string;
    order?: number | null;
  };

  if (!NOTION_HABITS_DATABASE_ID) {
    return NextResponse.json(
      { error: "Missing NOTION_HABITS_DATABASE_ID" },
      { status: 500 },
    );
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const created = await notion.pages.create({
    parent: { database_id: NOTION_HABITS_DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: name.trim() } }] },
      Active: { checkbox: true },
      ...(typeof order === "number" ? { Order: { number: order } } : {}),
    },
  } as any);

  return NextResponse.json({ habit: { id: (created as any).id } });
}
