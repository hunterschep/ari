import type { CalendarEventInput } from "@ari/schemas";
import { stableHash } from "@ari/shared";

export type Calendar = { id: string; summary: string; primary?: boolean };
export type BusyTimeInput = { calendarId: string; timeMin: string; timeMax: string };
export type BusyTime = { start: string; end: string };

export interface CalendarProvider {
  listCalendars(userId: string): Promise<Calendar[]>;
  getBusyTimes(input: BusyTimeInput): Promise<BusyTime[]>;
  createEvent(input: CalendarEventInput): Promise<{ eventId: string }>;
  updateEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}

export class MockCalendarProvider implements CalendarProvider {
  async listCalendars(userId: string): Promise<Calendar[]> {
    return [{ id: `calendar-${userId}`, summary: "Primary", primary: true }];
  }

  async getBusyTimes(): Promise<BusyTime[]> {
    return [];
  }

  async createEvent(input: CalendarEventInput): Promise<{ eventId: string }> {
    return { eventId: `cal-${stableHash(input).slice(0, 16)}` };
  }

  async updateEvent(): Promise<void> {}

  async deleteEvent(): Promise<void> {}
}
