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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { error: "date_from and date_to are required" },
      { status: 400 },
    );
  }
  if (!NOTION_HABIT_LOGS_DATABASE_ID) {
    return NextResponse.json(
      { error: "Missing NOTION_HABIT_LOGS_DATABASE_ID" },
      { status: 500 },
    );
  }

  const from = toISODateOnly(dateFrom);
  const to = toISODateOnly(dateTo);

  const filter: any = {
    and: [
      {
        property: "Date",
        date: { on_or_after: from },
      },
      {
        property: "Date",
        date: { on_or_before: to },
      },
    ],
  };

  const result = await notion.databases.query({
    database_id: NOTION_HABIT_LOGS_DATABASE_ID,
    filter,
    sorts: [
      { property: "Date", direction: "ascending" },
    ],
  } as any);

  const logs = result.results.map((page: any) => {
    const props = page.properties;
    const rel = props.Habit?.relation?.[0]?.id ?? null;
    return {
      id: page.id,
      habitId: rel,
      date: props.Date?.date?.start ?? "",
      done: !!props.Done?.checkbox,
    };
  });

  return NextResponse.json({ logs });
}
