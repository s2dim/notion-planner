import { notion } from "@/lib/notion";

const habitsDbId = process.env.NOTION_HABITS_DATABASE_ID;
const habitLogsDbId = process.env.NOTION_HABIT_LOGS_DATABASE_ID;

export const NOTION_HABITS_DATABASE_ID = habitsDbId;
export const NOTION_HABIT_LOGS_DATABASE_ID = habitLogsDbId;

export { notion };
