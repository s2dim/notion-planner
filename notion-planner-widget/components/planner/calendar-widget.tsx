"use client"

import { useState } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns"
import { ko } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { type PlannerData, type CalendarEvent, formatDate, generateId } from "@/lib/planner-store"

const EVENT_COLORS = [
  "bg-primary",
  "bg-accent",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
]

interface CalendarWidgetProps {
  data: PlannerData
  onUpdate: (data: PlannerData) => void
}

export function CalendarWidget({ data, onUpdate }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newEventText, setNewEventText] = useState("")
  const [selectedColor, setSelectedColor] = useState(0)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const getEventsForDate = (dateStr: string) =>
    data.calendarEvents.filter((e) => e.date === dateStr)

  const addEvent = () => {
    if (!newEventText.trim() || !selectedDate) return
    const event: CalendarEvent = {
      id: generateId(),
      date: selectedDate,
      text: newEventText.trim(),
      color: EVENT_COLORS[selectedColor],
    }
    onUpdate({
      ...data,
      calendarEvents: [...data.calendarEvents, event],
    })
    setNewEventText("")
    setIsAdding(false)
  }

  const removeEvent = (eventId: string) => {
    onUpdate({
      ...data,
      calendarEvents: data.calendarEvents.filter((e) => e.id !== eventId),
    })
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[100px] text-center text-sm font-medium text-muted-foreground">
            {format(currentMonth, "yyyy MMM", { locale: ko })}
          </span>
          <button
            onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {dayNames.map((day) => (
          <div
            key={day}
            className="pb-2 text-center text-[10px] font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dateStr = formatDate(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isToday = isSameDay(day, new Date())
          const isSelected = selectedDate === dateStr
          const events = getEventsForDate(dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex min-h-[40px] flex-col items-center rounded-md p-1 transition-all ${
                isSelected
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-secondary"
              } ${!isCurrentMonth ? "opacity-30" : ""}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              {events.length > 0 && (
                <div className="mt-0.5 flex gap-0.5">
                  {events.slice(0, 3).map((evt) => (
                    <div
                      key={evt.id}
                      className={`h-1 w-1 rounded-full ${evt.color}`}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-2 rounded-lg border bg-card/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {format(new Date(selectedDate), "M/d (EEE)", { locale: ko })}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {selectedEvents.map((evt) => (
            <div
              key={evt.id}
              className="group flex items-center gap-2"
            >
              <div className={`h-2 w-2 shrink-0 rounded-full ${evt.color}`} />
              <span className="flex-1 text-sm text-foreground">{evt.text}</span>
              <button
                onClick={() => removeEvent(evt.id)}
                className="hidden text-muted-foreground hover:text-destructive group-hover:block"
                aria-label={`Remove event: ${evt.text}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {isAdding ? (
            <div className="flex flex-col gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  addEvent()
                }}
              >
                <input
                  autoFocus
                  value={newEventText}
                  onChange={(e) => setNewEventText(e.target.value)}
                  onBlur={() => {
                    if (newEventText.trim()) addEvent()
                    else setIsAdding(false)
                  }}
                  placeholder="New event..."
                  className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/30"
                />
              </form>
              <div className="flex gap-1.5">
                {EVENT_COLORS.map((color, i) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(i)}
                    className={`h-4 w-4 rounded-full ${color} transition-all ${
                      selectedColor === i ? "ring-2 ring-foreground/20 ring-offset-1 ring-offset-card" : ""
                    }`}
                    aria-label={`Color ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              <Plus className="h-3 w-3" />
              <span>Add event</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
