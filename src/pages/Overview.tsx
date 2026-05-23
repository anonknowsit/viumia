import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getStatistics, getJobs } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Job, Statistics } from "@/types";
import {
  Briefcase,
  Clock,
  Send,
  XCircle,
  Star,
  ArrowRight,
  Rocket,
  Zap,
  AlertCircle,
  CalendarDays,
  TrendingUp,
  Filter,
} from "lucide-react";
import { cn } from "@/utils/cn";

export default function Overview() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([getStatistics(), getJobs()])
      .then(([s, jobs]) => {
        setStats(s);
        setAllJobs(jobs);
      })
      .finally(() => setLoading(false));
  }, []);

  const recentJobs = useMemo(() => {
    let jobs = [...allJobs];
    // Apply filter
    if (activeFilter === "favorites") {
      jobs = jobs.filter((j) => j.is_favorite);
    } else if (activeFilter !== "all") {
      jobs = jobs.filter((j) => j.status === activeFilter);
    }
    return jobs.slice(0, 5);
  }, [allJobs, activeFilter]);

  // Jobs added this week
  const jobsThisWeek = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return allJobs.filter((job) => new Date(job.created_at) >= oneWeekAgo)
      .length;
  }, [allJobs]);

  // Jobs waiting for follow-up (waiting status for >7 days)
  const needsFollowUp = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return allJobs.filter(
      (job) =>
        job.status === "waiting" && new Date(job.updated_at) < sevenDaysAgo,
    );
  }, [allJobs]);

  // Activity timeline - sorted by updated_at descending
  const activityTimeline = useMemo(() => {
    return [...allJobs]
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
      .slice(0, 5)
      .map((job) => ({
        ...job,
        timeAgo: getTimeAgo(job.updated_at),
        action:
          job.created_at === job.updated_at
            ? "Added"
            : `Status changed to ${job.status}`,
      }));
  }, [allJobs]);

  const filterChips = [
    { label: "All", value: "all", active: activeFilter === "all" },
    { label: "Applied", value: "applied", active: activeFilter === "applied" },
    { label: "Waiting", value: "waiting", active: activeFilter === "waiting" },
    {
      label: "Rejected",
      value: "rejected",
      active: activeFilter === "rejected",
    },
    {
      label: "Favorites",
      value: "favorites",
      active: activeFilter === "favorites",
    },
  ];

  const statCards = [
    {
      label: "Total Jobs",
      value: stats?.total ?? 0,
      icon: Briefcase,
      gradient: "from-blue-500/10 to-indigo-500/10",
      iconBg: "bg-blue-100 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-900",
    },
    {
      label: "Waiting",
      value: stats?.waiting ?? 0,
      icon: Clock,
      gradient: "from-yellow-500/10 to-orange-500/10",
      iconBg: "bg-yellow-100 dark:bg-yellow-950",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-900",
    },
    {
      label: "Applied",
      value: stats?.applied ?? 0,
      icon: Send,
      gradient: "from-emerald-500/10 to-green-500/10",
      iconBg: "bg-emerald-100 dark:bg-emerald-950",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-900",
    },
    {
      label: "Rejected",
      value: stats?.rejected ?? 0,
      icon: XCircle,
      gradient: "from-red-500/10 to-rose-500/10",
      iconBg: "bg-red-100 dark:bg-red-950",
      iconColor: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-900",
    },
    {
      label: "Favorites",
      value: stats?.favorites ?? 0,
      icon: Star,
      gradient: "from-yellow-500/10 to-orange-500/10",
      iconBg: "bg-yellow-100 dark:bg-yellow-950",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-900",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Your job application dashboard at a glance.
          </p>
        </div>
        <Link to="/jobs/new">
          <div className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02]">
            <Rocket className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            Add Job
          </div>
        </Link>
      </div>

      {/* Hero Banner (only when no jobs) */}
      {stats && stats.total === 0 && (
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 dark:border-blue-900 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-purple-950/50">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold">Get Started</h2>
            </div>
            <p className="text-muted-foreground mb-4 max-w-lg">
              Start tracking your job applications. Add your first job to see
              your dashboard come to life.
            </p>
            <Link to="/jobs/new">
              <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-600">
                <Briefcase className="h-4 w-4" />
                Add Your First Job
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>
          {/* Decorative background circles */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-200/30 blur-2xl" />
          <div className="absolute -bottom-8 -right-20 h-40 w-40 rounded-full bg-purple-200/30 blur-2xl" />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat, i) => (
          <Card
            key={stat.label}
            className={`overflow-hidden border-${stat.border} transition-all hover:shadow-md hover:-translate-y-0.5`}
          >
            {/* Top gradient accent line */}
            <div
              className={`h-1 w-full bg-gradient-to-r ${stat.gradient.replace("/10", "")}`}
            />
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2.5 ${stat.iconBg}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p
                  className="text-2xl font-bold tabular-nums animate-in fade-in duration-500"
                  style={{ animationDelay: `${i * 75}ms` }}
                >
                  {loading ? "—" : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Quick filters:</span>
        <div className="flex gap-2 flex-wrap">
          {filterChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => setActiveFilter(chip.value)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105",
                chip.active
                  ? "bg-primary text-primary-foreground ring-2 ring-blue-500/20"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Recent Jobs + Side Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Jobs */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Jobs</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Your latest tracked positions.
              </p>
            </div>
            <Link to="/jobs">
              <span className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                View all <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3 animate-pulse"
                  >
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-24 rounded bg-muted" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  No jobs tracked yet.
                </p>
                <Link to="/jobs/new">
                  <span className="mt-2 inline-block text-sm text-primary hover:underline font-medium">
                    Add your first job →
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="group flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-accent/50 hover:border-accent"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {job.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {job.company}
                        {job.location && ` · ${job.location}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {job.is_favorite && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                      )}
                      <Badge
                        variant={
                          job.status as
                            | "waiting"
                            | "applied"
                            | "rejected"
                            | "favorite"
                        }
                      >
                        {job.status.charAt(0).toUpperCase() +
                          job.status.slice(1)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Weekly Summary + Action Items + Activity */}
        <div className="space-y-4">
          {/* Weekly Summary */}
          <Card className="overflow-hidden">
            {/* Subtle gradient accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3 py-1">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {loading ? "—" : jobsThisWeek}
                </div>
                <div className="text-sm text-muted-foreground">
                  new job{jobsThisWeek !== 1 ? "s" : ""} tracked
                </div>
                {/* Gentle encouragement based on progress */}
                {!loading && (
                  <p className="text-xs text-muted-foreground/70 italic text-center">
                    {jobsThisWeek === 0
                      ? "Start adding jobs to see your progress"
                      : jobsThisWeek <= 2
                        ? "Every step counts — keep going"
                        : jobsThisWeek <= 4
                          ? "You're putting in the work — it pays off"
                          : "Your persistence will open doors"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          {needsFollowUp.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="rounded-lg bg-amber-100 dark:bg-amber-950 p-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Needs Follow-up
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Jobs in "Waiting" for over 7 days — consider following up.
                </p>
                <div className="space-y-2">
                  {needsFollowUp.map((job) => (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className="group flex items-center gap-2 rounded-md p-2 text-sm transition-all hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="truncate group-hover:text-amber-700 dark:group-hover:text-amber-300">
                        {job.title} — {job.company}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-muted" />
                      <div className="space-y-1">
                        <div className="h-3 w-28 rounded bg-muted" />
                        <div className="h-2 w-16 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityTimeline.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {activityTimeline.map((job) => (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className="group flex gap-2.5 text-sm"
                    >
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-background" />
                        <div className="w-px flex-1 bg-border" />
                      </div>
                      <div className="pb-3 -translate-y-0.5">
                        <p className="text-xs font-medium group-hover:text-primary transition-colors">
                          {job.action}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.title} — {job.company}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {job.timeAgo}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper: Format relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
