import { NextResponse } from "next/server";
import { notion, NOTION_TASKS_DB_ID } from "@/lib/notion";

type Slot = "morning" | "afternoon" | "evening";

function toISODateOnly(dateStr: string) {
  // 기대 포맷: YYYY-MM-DD
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

  const from = toISODateOnly(dateFrom);
  const to = toISODateOnly(dateTo);

  const filter: any = {
    and: [
      {
        property: "Date",
        date: {
          on_or_after: from,
        },
      },
      {
        property: "Date",
        date: {
          on_or_before: to,
        },
      },
    ],
  };

  const result = await notion.databases.query({
    database_id: NOTION_TASKS_DB_ID,
    filter,
    sorts: [
      { property: "Date", direction: "ascending" },
      { property: "Slot", direction: "ascending" },
    ],
  });

  const tasks = result.results.map((page: any) => {
    const props = page.properties;
    return {
      id: page.id,
      text: props.Name?.title?.[0]?.plain_text ?? "",
      date: props.Date?.date?.start ?? "",
      timeSlot: (props.Slot?.select?.name ?? "morning") as Slot,
      completed: !!props.Done?.checkbox,
    };
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { text, date, timeSlot } = body as {
    text: string;
    date: string;
    timeSlot: Slot;
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const created = await notion.pages.create({
    parent: { database_id: NOTION_TASKS_DB_ID },
    properties: {
      Name: { title: [{ text: { content: text.trim() } }] },
      Date: { date: { start: toISODateOnly(date) } },
      Slot: { select: { name: timeSlot } },
      Done: { checkbox: false },
    },
  });

  return NextResponse.json({
    task: { id: (created as any).id },
  });
}
