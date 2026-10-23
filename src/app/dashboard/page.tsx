"use client"

import * as React from "react"
import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import DashboardLayout from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import {
    Plus,
    Layers,
    TrendingUp,
    BadgeCheck,
    ShieldAlert,
    ArrowRight,
    Activity,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { motion } from "framer-motion"
import Link from "next/link"

import { STATUS_CONFIG, BUCKETS } from './status-registry'
import { StatCard } from '@/components/page-header'
import { StatusBadge, formatStatus } from '@/components/status-badge'

const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: '0 8px 24px -12px rgba(0,0,0,0.25)',
    color: 'var(--popover-foreground)',
    fontSize: 12,
    padding: '8px 12px',
}

const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
}

function Panel({ title, description, action, children, className = '' }: {
    title: string
    description?: string
    action?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <section className={`surface flex flex-col overflow-hidden ${className}`}>
            <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
                <div>
                    <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
                    {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
                </div>
                {action}
            </header>
            <div className="flex-1">{children}</div>
        </section>
    )
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth()
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading || !user) return
        axios.get(`/api/leads/stats?t=${Date.now()}`)
            .then(({ data }) => setStats(data))
            .catch(() => setStats(null))
            .finally(() => setLoading(false))
    }, [user, authLoading])

    const countFor = React.useCallback(
        (status: string) => stats?.statusCounts?.find((s: any) => s._id === status)?.count || 0,
        [stats]
    )

    const categorizedStats = useMemo(() => {
        const bucketCount = (bucket: string[]) => bucket.reduce((acc, status) => acc + countFor(status), 0)
        return {
            pipelines: bucketCount(BUCKETS.PIPELINE),
            closures: bucketCount(BUCKETS.CONVERSION),
            issues: bucketCount(BUCKETS.RISK),
        }
    }, [countFor])

    const statusRows = useMemo(() => {
        const known = Object.keys(STATUS_CONFIG).map(status => ({ statusKey: status, name: formatStatus(status), value: countFor(status) }))
        const extras = (stats?.statusCounts || [])
            .filter((item: { _id?: string }) => item._id && !STATUS_CONFIG[item._id])
            .map((item: { _id: string; count: number }) => ({ statusKey: item._id, name: formatStatus(item._id), value: item.count }))
        return [...known, ...extras].sort((a, b) => b.value - a.value)
    }, [countFor, stats])
    const activeStatusRows = statusRows.filter(row => row.value > 0).slice(0, 10)

    const totalLeads = stats?.totalLeads || 0
    const conversionRate = totalLeads > 0 ? Math.round((categorizedStats.closures / totalLeads) * 100) : 0

    const funnel = [
        { stage: 'Total', value: totalLeads, fill: 'var(--chart-1)' },
        { stage: 'Active', value: categorizedStats.pipelines, fill: 'var(--chart-2)' },
        { stage: 'Verified', value: countFor('VERIFIED') + countFor('ID_VERIFIED'), fill: 'var(--chart-3)' },
        { stage: 'Paid', value: countFor('PAID'), fill: 'var(--chart-4)' },
    ]

    const ratio = [
        { name: 'In pipeline', value: categorizedStats.pipelines, color: 'var(--chart-1)' },
        { name: 'Converted', value: categorizedStats.closures, color: 'var(--chart-3)' },
        { name: 'At risk', value: categorizedStats.issues, color: 'var(--destructive)' },
    ]
    const ratioTotal = ratio.reduce((acc, item) => acc + item.value, 0)

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.09] via-card to-chart-2/[0.07] p-6 md:p-8">
                    <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
                    <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-2">
                            <p className="eyebrow">{format(new Date(), 'EEEE, MMMM d')}</p>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                {greeting()}, {user?.name?.split(' ')[0] || 'there'}
                            </h1>
                            <p className="max-w-xl text-sm text-muted-foreground">
                                {loading
                                    ? 'Pulling together your pipeline…'
                                    : <>You have <span className="font-semibold text-foreground">{categorizedStats.pipelines}</span> leads in the pipeline and a <span className="font-semibold text-foreground">{conversionRate}%</span> conversion rate.</>}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button asChild variant="outline">
                                <Link href="/leads">View leads</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/leads/create"><Plus className="h-4 w-4" /> New lead</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {loading ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="surface space-y-3 p-5">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    )) : (
                        <>
                            <StatCard label="Total leads" value={totalLeads.toLocaleString()} icon={Layers} tone="primary" hint="All time" />
                            <StatCard label="In pipeline" value={categorizedStats.pipelines.toLocaleString()} icon={TrendingUp} tone="info" hint="Active and being worked" />
                            <StatCard label="Conversions" value={categorizedStats.closures.toLocaleString()} icon={BadgeCheck} tone="success" hint={`${conversionRate}% of all leads`} />
                            <StatCard label="Risk alerts" value={categorizedStats.issues.toLocaleString()} icon={ShieldAlert} tone="danger" hint="Fraud, duplicates, rejections" />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Panel
                        title="Status distribution"
                        description="Top statuses by lead count"
                        className="lg:col-span-2"
                        action={
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                                <span className="relative flex size-1.5">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                                    <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                                </span>
                                Live
                            </span>
                        }
                    >
                        <div className="h-[340px] px-3 pb-4">
                            {loading ? (
                                <div className="space-y-3 px-2 pt-2">
                                    {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-6" style={{ width: `${90 - i * 10}%` }} />)}
                                </div>
                            ) : activeStatusRows.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No leads to chart yet.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={activeStatusRows} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis type="number" hide allowDecimals={false} />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={130}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                                        />
                                        <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} contentStyle={tooltipStyle} />
                                        <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]} barSize={16}>
                                            {activeStatusRows.map(entry => (
                                                <Cell key={entry.statusKey} fill={STATUS_CONFIG[entry.statusKey]?.color || '#64748b'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Panel>

                    <Panel
                        title="Recent activity"
                        description="Latest status changes"
                        action={<Activity className="h-4 w-4 text-muted-foreground" />}
                    >
                        <div className="h-[340px] overflow-y-auto px-2 pb-3">
                            {loading ? (
                                <div className="space-y-4 p-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Skeleton className="size-9 rounded-full" />
                                            <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
                                        </div>
                                    ))}
                                </div>
                            ) : stats?.recentActivity?.length > 0 ? (
                                <ul className="space-y-0.5">
                                    {stats.recentActivity.map((act: any, i: number) => (
                                        <li key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                                                {act.firstName?.[0]}{act.lastName?.[0]}
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <p className="truncate text-[13px] font-semibold text-foreground">{act.firstName} {act.lastName}</p>
                                                <StatusBadge status={act.statusHistory?.toStatus} className="px-2 py-0 text-[11px]" />
                                            </div>
                                            <span className="shrink-0 text-[11px] text-muted-foreground" title={format(new Date(act.statusHistory.timestamp), 'MMM d, yyyy h:mm a')}>
                                                {formatDistanceToNow(new Date(act.statusHistory.timestamp), { addSuffix: true })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No recent activity.</div>
                            )}
                        </div>
                    </Panel>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Panel title="Funnel overview" description="From intake to paid">
                        <div className="h-[260px] px-3 pb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnel} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                                    <YAxis hide allowDecimals={false} />
                                    <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} contentStyle={tooltipStyle} />
                                    <Bar dataKey="value" name="Leads" radius={[8, 8, 0, 0]} barSize={44}>
                                        {funnel.map(item => <Cell key={item.stage} fill={item.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Panel>

                    <Panel title="Outcome mix" description="Pipeline vs. converted vs. at risk">
                        <div className="flex h-[260px] items-center gap-6 px-5 pb-5">
                            <div className="relative h-full flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={ratioTotal > 0 ? ratio : [{ name: 'Empty', value: 1, color: 'var(--muted)' }]}
                                            innerRadius="68%"
                                            outerRadius="92%"
                                            paddingAngle={ratioTotal > 0 ? 3 : 0}
                                            cornerRadius={6}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {(ratioTotal > 0 ? ratio : [{ name: 'Empty', color: 'var(--muted)' }]).map(item => (
                                                <Cell key={item.name} fill={item.color} />
                                            ))}
                                        </Pie>
                                        {ratioTotal > 0 && <Tooltip contentStyle={tooltipStyle} />}
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{conversionRate}%</span>
                                    <span className="text-xs text-muted-foreground">conversion</span>
                                </div>
                            </div>
                            <ul className="w-40 space-y-3">
                                {ratio.map(item => (
                                    <li key={item.name} className="space-y-1">
                                        <div className="flex items-center justify-between text-[13px]">
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <span className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                                                {item.name}
                                            </span>
                                            <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Panel>
                </div>

                <Panel
                    title="Status breakdown"
                    description="Every status at a glance. Click one to see those leads."
                    action={
                        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                            <Link href="/leads">All leads <ArrowRight className="h-3.5 w-3.5" /></Link>
                        </Button>
                    }
                >
                    <div className="grid grid-cols-2 gap-2 p-4 pt-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                        {statusRows.map(({ statusKey, name, value }) => {
                            const config = STATUS_CONFIG[statusKey] || { icon: null, color: '#64748b' }
                            const percentage = totalLeads > 0 ? (value / totalLeads) * 100 : 0
                            return (
                                <Link
                                    key={statusKey}
                                    href={`/leads?status=${encodeURIComponent(statusKey)}`}
                                    className="group rounded-xl border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-xs font-medium text-muted-foreground group-hover:text-foreground">{name}</span>
                                        <span
                                            className="flex size-6 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5"
                                            style={{ color: config.color, backgroundColor: `${config.color}17` }}
                                        >
                                            {config.icon}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xl font-bold tabular-nums tracking-tight text-foreground">{value}</div>
                                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: config.color }}
                                        />
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </Panel>
            </div>
        </DashboardLayout>
    )
}
