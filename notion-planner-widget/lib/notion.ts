import { Client } from "@notionhq/client";

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export const NOTION_TASKS_DB_ID = process.env.NOTION_TASKS_DB_ID as string;

if (!process.env.NOTION_TOKEN) {
  throw new Error("Missing NOTION_TOKEN in env");
}
if (!process.env.NOTION_TASKS_DB_ID) {
  throw new Error("Missing NOTION_TASKS_DB_ID in env");
}
