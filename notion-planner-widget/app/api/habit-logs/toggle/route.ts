import { NextResponse } from "next/server";
import {
  notion,
  NOTION_HABIT_LOGS_DATABASE_ID,
} from "@/lib/notion-habits";

function toISODateOnly(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }
  return dateStr;
}

export async function POST(req: Request) {
  const { habitId, date, done } = (await req.json()) as {
    habitId: string;
    date: string;
    done: boolean;
  };

  if (!habitId || !date) {
    return NextResponse.json(
      { error: "habitId and date are required" },
      { status: 400 },
    );
  }
  if (!NOTION_HABIT_LOGS_DATABASE_ID) {
    return NextResponse.json(
      { error: "Missing NOTION_HABIT_LOGS_DATABASE_ID" },
      { status: 500 },
    );
  }

  const dateStr = toISODateOnly(date);

  // find existing log for (habitId, date)
  const query = await notion.databases.query({
    database_id: NOTION_HABIT_LOGS_DATABASE_ID,
    filter: {
      and: [
        { property: "Date", date: { equals: dateStr } },
        { property: "Habit", relation: { contains: habitId } } as any,
      ],
    },
    page_size: 1,
  } as any);

  const existing = query.results[0] as any | undefined;

  if (existing) {
    await notion.pages.update({
      page_id: existing.id,
      properties: {
        Done: { checkbox: !!done },
      },
    } as any);
    return NextResponse.json({ log: { id: existing.id } });
  }

  const created = await notion.pages.create({
    parent: { database_id: NOTION_HABIT_LOGS_DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: dateStr } }] },
      Habit: { relation: [{ id: habitId }] },
      Date: { date: { start: dateStr } },
      Done: { checkbox: !!done },
    },
  } as any);

  return NextResponse.json({ log: { id: (created as any).id } });
}
