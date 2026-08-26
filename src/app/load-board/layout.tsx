import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Load Board Preview | Freight We Run",
  description:
    "A sample of the lanes and freight Thind Transport drivers run — flatbed, reefer, and dry van loads across the lower 48 with transparent rates per mile.",
  alternates: { canonical: "/load-board" },
}

export default function LoadBoardLayout({ children }: { children: React.ReactNode }) {
  return children
}
