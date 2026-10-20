"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { ChevronRight, Moon, Plus, Sun } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

const crumbsForPath = (pathname: string): { label: string; href?: string }[] => {
  if (pathname.startsWith("/admin/leads/edit/")) {
    return [{ label: "Lead Management", href: "/admin/leads" }, { label: "Edit lead" }]
  }
  if (pathname.startsWith("/admin/leads/")) {
    return [{ label: "Lead Management", href: "/admin/leads" }, { label: "Lead details" }]
  }
  if (pathname.startsWith("/admin/leads")) return [{ label: "Lead Management" }]
  if (pathname.startsWith("/admin/sessions")) return [{ label: "Administration" }, { label: "Sessions" }]
  if (pathname.startsWith("/admin")) return [{ label: "Administration" }, { label: "Users" }]
  if (pathname.startsWith("/leads/create")) return [{ label: "My Leads", href: "/leads" }, { label: "New lead" }]
  if (pathname.startsWith("/leads/")) return [{ label: "My Leads", href: "/leads" }, { label: "Lead details" }]
  if (pathname.startsWith("/leads")) return [{ label: "My Leads" }]
  if (pathname.startsWith("/security")) return [{ label: "Account" }, { label: "Security" }]
  return [{ label: "Dashboard" }]
}

export function SiteHeader() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const crumbs = crumbsForPath(pathname)
  const showNewLead = !pathname.startsWith("/leads/create") && !pathname.includes("/edit/")

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="mx-1.5 h-5" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1
            return (
              <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />}
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={last ? "truncate font-semibold text-foreground" : "truncate text-muted-foreground"}>
                    {crumb.label}
                  </span>
                )}
              </span>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {showNewLead && (
            <Button asChild size="sm" className="hidden h-8 sm:inline-flex">
              <Link href="/leads/create">
                <Plus className="size-4" />
                New lead
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 text-muted-foreground"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  )
}
