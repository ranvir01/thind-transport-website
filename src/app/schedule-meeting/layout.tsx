import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Schedule a Call With Recruiting",
  description:
    "Pick a time and our recruiting team will call you to talk through pay, lanes, and equipment — no pressure, no obligation.",
  alternates: { canonical: "/schedule-meeting" },
}

export default function ScheduleMeetingLayout({ children }: { children: React.ReactNode }) {
  return children
}
