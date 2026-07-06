"use client";

import { useEffect, useState } from "react";
import { Eye, MonitorSmartphone, MousePointerClick, Users } from "lucide-react";
import api from "@/lib/api";
import EmptyState from "@/components/common/EmptyState";
import ErrorMessage from "@/components/common/ErrorMessage";
import Loading from "@/components/common/Loading";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "-";
const formatTime = (value) => value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

export default function SiteReachPage() {
  const { user, loading: authLoading } = useAuth();
  const [reach, setReach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== "admin") {
      setLoading(false);
      return;
    }

    api.get("/analytics/reach")
      .then(({ data }) => setReach(data.reach))
      .catch(() => setError("Unable to load site reach analytics"))
      .finally(() => setLoading(false));
  }, [authLoading, user?.role]);

  return (
    <ProtectedRoute roles={["admin"]}>
      <DashboardLayout title="Site reach">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : <SiteReachPanel reach={reach} />}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function SiteReachPanel({ reach }) {
  const data = reach || {};
  const maxDaily = Math.max(1, ...(data.dailyTrend || []).map((item) => item.visits));
  const maxPages = Math.max(1, ...(data.topPages || []).map((item) => item.visits));
  const maxSources = Math.max(1, ...(data.sources || []).map((item) => item.visits));
  const maxDevices = Math.max(1, ...(data.devices || []).map((item) => item.visits));
  const maxBrowsers = Math.max(1, ...(data.browsers || []).map((item) => item.visits));

  return (
    <section className="space-y-5">
      <div className="rounded-[1.5rem] border border-violet-100 bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-700 p-5 text-white shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-100">Website reach</p>
        <h1 className="mt-2 text-2xl font-black">Traffic and visitor analytics</h1>
        <p className="mt-1 max-w-3xl text-sm font-semibold text-violet-100/80">Track how many people are visiting Zasoota, which pages they open, where traffic comes from, and what devices they use.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard icon={Eye} label="Total Visits" value={Number(data.totalVisits || 0).toLocaleString()} hint={`Last ${data.days || 30} days`} />
        <AnalyticsCard icon={Users} label="Unique Visitors" value={Number(data.uniqueVisitors || 0).toLocaleString()} hint="Distinct visitors" />
        <AnalyticsCard icon={MousePointerClick} label="Today" value={Number(data.todayVisits || 0).toLocaleString()} hint="Visits today" />
        <AnalyticsCard icon={MonitorSmartphone} label="Top Device" value={data.devices?.[0]?.label || "No data"} hint={`${data.devices?.[0]?.visits || 0} visits`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Daily reach trend">
          {data.dailyTrend?.length ? data.dailyTrend.slice(-14).map((item) => (
            <BarRow key={item.date} label={item.date} value={item.visits} max={maxDaily} />
          )) : <EmptyState title="No reach data yet" message="Visitor data will appear after people open the website." />}
        </ChartCard>
        <ChartCard title="Top pages">
          {data.topPages?.length ? data.topPages.map((item) => (
            <BarRow key={item.path} label={item.path} value={item.visits} max={maxPages} />
          )) : <EmptyState title="No page data" message="Tracked pages will appear here." />}
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title="Traffic sources">
          {data.sources?.length ? data.sources.map((item) => (
            <BarRow key={item.label} label={item.label || "Direct"} value={item.visits} max={maxSources} />
          )) : <EmptyState title="No source data" message="Referrers and direct traffic will appear here." />}
        </ChartCard>
        <ChartCard title="Devices">
          {data.devices?.length ? data.devices.map((item) => (
            <BarRow key={item.label} label={item.label || "Unknown"} value={item.visits} max={maxDevices} />
          )) : <EmptyState title="No device data" message="Device types will appear here." />}
        </ChartCard>
        <ChartCard title="Browsers">
          {data.browsers?.length ? data.browsers.map((item) => (
            <BarRow key={item.label} label={item.label || "Unknown"} value={item.visits} max={maxBrowsers} />
          )) : <EmptyState title="No browser data" message="Browser data will appear here." />}
        </ChartCard>
      </div>

      <ChartCard title="Recent visits">
        {data.recentVisits?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-violet-950/50 dark:text-violet-100/50">
                <tr>
                  <th className="py-2 pr-4">Page</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">Browser</th>
                  <th className="py-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100 dark:divide-violet-900/60">
                {data.recentVisits.map((visit) => (
                  <tr key={`${visit._id || visit.path}-${visit.createdAt}`}>
                    <td className="max-w-[260px] truncate py-3 pr-4 font-black text-ink dark:text-white" title={visit.path}>{visit.path}</td>
                    <td className="py-3 pr-4 text-stone-600 dark:text-stone-300">{visit.source || "Direct"}</td>
                    <td className="py-3 pr-4 capitalize text-stone-600 dark:text-stone-300">{visit.deviceType || "unknown"}</td>
                    <td className="py-3 pr-4 text-stone-600 dark:text-stone-300">{visit.browser || "Unknown"}</td>
                    <td className="whitespace-nowrap py-3 text-right text-stone-500">{formatDate(visit.createdAt)} {formatTime(visit.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No recent visits" message="The latest tracked page views will appear here." />}
      </ChartCard>
    </section>
  );
}

function AnalyticsCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-950/55 dark:text-violet-100/60">{label}</p>
          <p className="mt-2 text-3xl font-black text-ink dark:text-white">{value}</p>
          <p className="mt-2 text-xs font-bold text-meadow">{hint}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function BarRow({ label, value, max, prefix = "" }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="truncate capitalize text-stone-600 dark:text-stone-300" title={label}>{label}</span>
        <strong className="shrink-0">{prefix}{Number(value).toLocaleString()}</strong>
      </div>
      <div className="h-2 rounded-full bg-mist dark:bg-stone-800">
        <div className="h-2 rounded-full bg-meadow" style={{ width: value ? `${Math.max(4, (value / max) * 100)}%` : "0%" }} />
      </div>
    </div>
  );
}
