import { z } from "zod";
import { ProposedSlotSchema } from "./common";

export const TourSchema = z.object({
  id: z.string(),
  userId: z.string(),
  listingId: z.string(),
  conversationId: z.string().optional(),
  status: z.enum([
    "REQUESTED",
    "PROPOSED",
    "USER_APPROVED",
    "CONFIRMED",
    "CONFIRMED_CALENDAR_FAILED",
    "RESCHEDULE_REQUESTED",
    "CANCELLED",
    "COMPLETED",
    "NO_SHOW"
  ]),
  proposedSlots: z.array(ProposedSlotSchema).default([]),
  selectedSlot: ProposedSlotSchema.optional(),
  calendarEventId: z.string().optional(),
  location: z.string().optional(),
  instructions: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const CalendarEventInputSchema = z.object({
  summary: z.string(),
  location: z.string(),
  description: z.string(),
  startDateTime: z.string(),
  endDateTime: z.string(),
  attendees: z.array(z.object({ email: z.string().email() })).optional(),
  reminders: z.object({
    useDefault: z.boolean(),
    overrides: z.array(z.object({
      method: z.enum(["email", "popup"]),
      minutes: z.number().positive()
    })).optional()
  })
});

export type Tour = z.infer<typeof TourSchema>;
export type CalendarEventInput = z.infer<typeof CalendarEventInputSchema>;
