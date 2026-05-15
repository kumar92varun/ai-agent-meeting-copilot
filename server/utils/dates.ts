import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz'

const IST = 'Asia/Kolkata'

export function nowIST(): Date {
  return toZonedTime(new Date(), IST)
}

export function todayDateIST(): string {
  return formatTz(nowIST(), 'yyyy-MM-dd', { timeZone: IST })
}

export function toISTDate(date: Date): string {
  return formatTz(toZonedTime(date, IST), 'yyyy-MM-dd', { timeZone: IST })
}

export function fromISTDate(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00`, IST)
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = fromISTDate(dateStr)
  d.setDate(d.getDate() + days)
  return toISTDate(d)
}
