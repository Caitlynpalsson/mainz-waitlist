import { denverDate } from "./time.ts";
import type { Farmer } from "./types.ts";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface TextingGate {
  allowText: boolean;
  recordCall: boolean;
  reason: string;
}

/** Who a text would go to. Call-only farms are not texted. */
export function textTarget(farmer: Farmer): { name: string; phone: string } {
  if (farmer.contactMethod === "delegate" && farmer.delegateName.trim()) {
    return { name: farmer.delegateName.trim(), phone: farmer.delegatePhone.trim() || farmer.phone };
  }
  return { name: farmer.contactName, phone: farmer.phone };
}

/**
 * Automation uses this before any bot text.
 * A call preference, or a delegate with no phone, becomes a staff call instead.
 * Preferred days and an explicit HH:MM-HH:MM window are honored in America/Denver.
 * Free-text times such as "mornings" are kept for staff and are not guessed into a clock.
 */
export function textingGate(farmer: Farmer, now: Date): TextingGate {
  if (farmer.contactMethod === "call") {
    return { allowText: false, recordCall: true, reason: "this farm asked for a call, not a text. they are on the call list." };
  }
  if (farmer.contactMethod === "delegate" && !farmer.delegatePhone.trim()) {
    return {
      allowText: false,
      recordCall: true,
      reason: "a family member or employee is the contact, and there is no phone for them.",
    };
  }
  const days = farmer.preferredContactDays
    .split(",")
    .map((day) => day.trim().toLowerCase())
    .filter(Boolean);
  if (days.length) {
    const today = DAYS[denverDate(now).weekday];
    if (!days.includes(today)) {
      return { allowText: false, recordCall: false, reason: "today is outside their preferred contact days." };
    }
  }
  const window = parseWindow(farmer.preferredContactTimes);
  if (window) {
    const minutes = denverMinutes(now);
    const inside = window.start <= window.end
      ? minutes >= window.start && minutes <= window.end
      : minutes >= window.start || minutes <= window.end;
    if (!inside) {
      return { allowText: false, recordCall: false, reason: "this is outside their preferred contact time." };
    }
  }
  return { allowText: true, recordCall: false, reason: "" };
}

function parseWindow(value: string): { start: number; end: number } | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  if (start > 24 * 60 || end > 24 * 60) return null;
  return { start, end };
}

function denverMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}
