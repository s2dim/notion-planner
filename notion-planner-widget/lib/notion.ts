import { Client } from "@notionhq/client";

const token = process.env.NOTION_TOKEN;
const dbId = process.env.NOTION_TASKS_DB_ID;

if (!token) throw new Error("Missing NOTION_TOKEN in .env.local");
if (!dbId) throw new Error("Missing NOTION_TASKS_DB_ID in .env.local");

export const notion = new Client({ auth: token });
export const NOTION_TASKS_DB_ID = dbId;
