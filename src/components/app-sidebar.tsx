"use client"

import * as React from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  Users,
  Lock,
  ActivitySquare,
  ListChecks,
  Table2,
  Plus,
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "My Leads", href: "/leads", icon: ListChecks },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Lead Management", href: "/admin/leads", icon: Table2, roles: ["admin", "super_admin"] },
      { label: "Users", href: "/admin", icon: Users, roles: ["admin", "super_admin"] },
      { label: "Sessions", href: "/admin/sessions", icon: ActivitySquare, roles: ["super_admin"] },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Security", href: "/security", icon: Lock }],
  },
]

const isActivePath = (pathname: string, href: string) => {
  if (href === "/admin") return pathname === "/admin"
  if (href === "/leads") return pathname === "/leads" || (pathname.startsWith("/leads/") && !pathname.startsWith("/leads/create"))
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const pathname = usePathname()
  const role = user?.role || ""

  const groups = NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(item => !item.roles || item.roles.includes(role)) }))
    .filter(group => group.items.length > 0)

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border" {...props}>
      <SidebarHeader className="px-3 pt-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Image src="/logo.png" width={20} height={20} alt="VetoAxis" className="shrink-0" />
                </div>
                <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="text-[15px] font-bold tracking-tight text-foreground">VetoAxis</span>
                  <span className="text-[11px] font-medium text-muted-foreground">Lead CRM</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <Link
          href="/leads/create"
          className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition hover:bg-primary/90 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:mx-auto"
        >
          <Plus className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">New Lead</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="no-scrollbar gap-0 px-1">
        {groups.map(group => (
          <SidebarGroup key={group.title} className="py-2">
            <SidebarGroupLabel className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
              {group.title}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {group.items.map(item => {
                const active = isActivePath(pathname, item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="relative h-9 rounded-lg px-3 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
                    >
                      <Link href={item.href}>
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary group-data-[collapsible=icon]:hidden" />
                        )}
                        <item.icon className="size-[18px]" />
                        <span className="text-[13.5px]">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <NavUser
          user={{
            name: user?.name || "User",
            email: user?.email || "",
            avatar: "",
            role,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
