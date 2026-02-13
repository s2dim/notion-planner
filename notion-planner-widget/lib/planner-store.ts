import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  getWeek,
  getYear,
} from "date-fns"
import { ko } from "date-fns/locale"

export type TimeSlot = "morning" | "afternoon" | "evening"

export interface WeeklyTask {
  id: string
  text: string
  timeSlot: TimeSlot
  date: string // YYYY-MM-DD
}

export interface DailyTask {
  id: string
  text: string
  timeSlot: TimeSlot
  completed: boolean
  date: string
}

export interface MonthlyGoal {
  id: string
  text: string
  completed: boolean
}

export interface YearlyGoal {
  id: string
  text: string
  completed: boolean
}

export interface HabitEntry {
  habitId: string
  dayOfWeek: number // 0=Mon, 6=Sun
  completed: boolean
}

export interface Habit {
  id: string
  name: string
}

export interface PlannerData {
  weeklyTasks: WeeklyTask[]
  dailyTasks: DailyTask[]
  monthlyGoals: MonthlyGoal[]
  yearlyGoals: YearlyGoal[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  calendarEvents: CalendarEvent[]
}

export interface CalendarEvent {
  id: string
  date: string
  text: string
  color: string
}

const STORAGE_KEY = "planner-widget-data"

export function getDefaultData(): PlannerData {
  return {
    weeklyTasks: [],
    dailyTasks: [],
    monthlyGoals: [],
    yearlyGoals: [],
    habits: [],
    habitEntries: [],
    calendarEvents: [],
  }
}

export function loadData(): PlannerData {
  if (typeof window === "undefined") return getDefaultData()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return getDefaultData()
}

export function saveData(data: PlannerData) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function getCurrentWeekDays(date: Date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function getWeekLabel(date: Date = new Date()) {
  const year = getYear(date)
  const week = getWeek(date, { weekStartsOn: 1 })
  return `${year} Week ${week}`
}

export function formatDate(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export function formatDateShort(date: Date) {
  return format(date, "M/d (EEE)", { locale: ko })
}

export function getDayName(date: Date) {
  return format(date, "EEE", { locale: ko })
}

export const TIME_SLOT_CONFIG: Record<
  TimeSlot,
  { label: string; icon: string; colorClass: string }
> = {
  morning: {
    label: "Morning",
    icon: "sunrise",
    colorClass: "text-amber-500",
  },
  afternoon: {
    label: "Afternoon",
    icon: "sun",
    colorClass: "text-emerald-500",
  },
  evening: {
    label: "Evening",
    icon: "moon",
    colorClass: "text-indigo-400",
  },
}

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
export const DAY_NAMES_KR = ["월", "화", "수", "목", "금", "토", "일"]
