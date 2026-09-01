"use client"

import { useRouter } from "next/navigation"

// Office list tables style rows as clickable (hover:bg-hover) but historically
// only the reference cell carried a <Link>. This makes the whole row navigate
// while keeping the inner link for middle-click, cmd-click, and keyboard users.
export function RowLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  return (
    <tr
      className={className}
      onClick={(e) => {
        // Real interactive elements inside the row keep their own behavior.
        if ((e.target as HTMLElement).closest("a, button, input, select, textarea, label")) return
        // Don't hijack a click that ends a text selection (copying a ref/amount).
        if (window.getSelection()?.toString()) return
        if (e.metaKey || e.ctrlKey) {
          window.open(href, "_blank", "noopener")
          return
        }
        router.push(href)
      }}
    >
      {children}
    </tr>
  )
}
