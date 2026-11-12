"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {

  Activity,

  ArrowRight,

  ArrowUpRight,

  BarChart3,

  BookOpen,

  CalendarDays,

  CheckCircle2,

  Clock3,

  ListTodo,

  PieChart,

  Target,

  TrendingUp,

  Zap,
  X,

} from "lucide-react";

import styles from "./analytics.module.css";
import AuthRequired from "@/components/auth/AuthRequired";

type Period = "Week" | "Month" | "Semester";

type AnalyticsData = {
  period: Period;
  range: { start: string; end: string };
  summary: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
    planned: number;
    completedInPeriod: number;
    periodCompletionRate: number;
  };
  series: { label: string; completed: number; planned: number }[];
  categories: { name: string; count: number }[];
  priorities: { name: string; count: number }[];
  studyTime: { plannedMinutes: number; actualMinutes: number; hasTrackedTime: boolean };
  recentActivity: {
    id: string;
    title: string;
    category: string | null;
    status: string | null;
    action: "created" | "updated" | "completed" | "reopened" | "deleted";
    createdAt: string;
  }[];
};

const categoryColors = ["#8b5cf6", "#f36b91", "#f5bd42", "#39bd8a", "#54a8d8"];
const priorityColors: Record<string, string> = {
  High: "#f36b91",
  Medium: "#f5bd42",
  Low: "#39bd8a",
};

export default function AnalyticsPage() {

  const [period, setPeriod] = useState<Period>("Week");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadAnalytics() {
      try {
        const response = await fetch(`/api/analytics?period=${period}`, { cache: "no-store" });
        const result = await response.json();
        if (cancelled) return;
        if (response.status === 401) setAuthRequired(true);
        else if (!response.ok) setError(result.error?.message || "Analytics could not be loaded.");
        else setAnalytics(result.data as AnalyticsData);
      } catch {
        if (!cancelled) setError("The analytics service is unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadAnalytics();
    return () => { cancelled = true; };
  }, [period]);

  const chartData = analytics?.series ?? [];
  const stats = {
    planned: analytics?.summary.planned ?? 0,
    completed: analytics?.summary.completedInPeriod ?? 0,
    completion: analytics?.summary.periodCompletionRate ?? 0,
  };
  const chartMax = Math.max(...chartData.flatMap((item) => [item.planned, item.completed]), 1);
  const categories = (analytics?.categories ?? []).map((item, index) => ({
    ...item,
    color: categoryColors[index % categoryColors.length],
  }));
  const priorities = (analytics?.priorities ?? []).map((item) => ({
    ...item,
    color: priorityColors[item.name] ?? categoryColors[0],
  }));
  const categoryTotal = categories.reduce((total, item) => total + item.count, 0);
  const priorityTotal = priorities.reduce((total, item) => total + item.count, 0);
  const activities = (analytics?.recentActivity ?? []).map((item) => {
    const type = item.action === "completed" ? "success" : item.action === "deleted" || item.action === "reopened" ? "warning" : "primary";
    const Icon = item.action === "completed" ? CheckCircle2 : item.action === "deleted" ? X : item.action === "created" ? ListTodo : Activity;
    const status = item.action.charAt(0).toUpperCase() + item.action.slice(1);
    return { ...item, type, Icon, status };
  });

  if (authRequired) return <main className={styles.page}><AuthRequired /></main>;
  if (loading && !analytics) return <main className={styles.page}><p role="status">Loading your analytics...</p></main>;

  return (

    <main className={styles.page}>

      <div className={styles.container}>

        <header className={styles.heading}>

          <div className={styles.headingText}>

            <p className={styles.eyebrow}>

              YOUR STUDY WORKSPACE

            </p>

            <h1>

              Analytics <span>✦</span>

            </h1>

            <p className={styles.subtitle}>

              {analytics
                ? `${analytics.range.start} to ${analytics.range.end} · ${analytics.summary.total} total tasks · ${analytics.summary.pending} remaining · ${analytics.summary.overdue} overdue`
                : "Live study progress for your selected period."}

            </p>

          </div>

          <Link href="/my-tasks" className={styles.primaryButton}>

            <ListTodo size={18} />

            View My Tasks

          </Link>

        </header>

        {loading && analytics && <p className={styles.loadingNotice} role="status">Updating {period.toLowerCase()} analytics...</p>}
        {error && <p className={styles.errorNotice} role="alert">{error}</p>}
        {analytics?.summary.total === 0 && (
          <section className={styles.emptyState}>
            <BookOpen size={23} />
            <div>
              <strong>No tasks in your workspace yet</strong>
              <p>Create a task to start building your real study analytics.</p>
            </div>
            <Link href="/add-task" className={styles.primaryButton}>Create a task</Link>
          </section>
        )}

        <section className={styles.periodBar}>

          <div className={styles.periodLabel}>

            <CalendarDays size={19} />

            <span>Performance overview</span>

          </div>

          <div

            className={styles.periodSwitch}

            role="group"

            aria-label="Select analytics period"

          >

            {(["Week", "Month", "Semester"] as Period[]).map(

              (item) => (

                <button

                  key={item}

                  type="button"

                  className={

                    period === item

                      ? `${styles.periodButton} ${styles.selected}`

                      : styles.periodButton

                  }

                  onClick={() => {
                    if (item !== period) {
                      setLoading(true);
                      setError("");
                      setPeriod(item);
                    }
                  }}

                  aria-pressed={period === item}

                >

                  {item}

                </button>

              )

            )}

          </div>

        </section>

        <section

          className={styles.statsGrid}

          aria-label="Study statistics"

        >

          <article className={styles.statCard}>

            <div className={styles.statTop}>

              <div className={`${styles.statIcon} ${styles.purple}`}>

                <ListTodo size={22} />

              </div>

              <span className={styles.statTag}>Overview</span>

            </div>

            <p className={styles.statLabel}>Tasks completed</p>

            <h2>{stats.completed}</h2>

            <div className={styles.statFoot}>

              <span>Of {stats.planned} tasks due in this period</span>

              <span className={styles.statAccent}>

                <ArrowUpRight size={15} />

                {stats.completion}%

              </span>

            </div>

          </article>

          <article className={styles.statCard}>

            <div className={styles.statTop}>

              <div className={`${styles.statIcon} ${styles.green}`}>

                <CheckCircle2 size={22} />

              </div>

              <span className={styles.statTag}>Progress</span>

            </div>

            <p className={styles.statLabel}>Completion rate</p>

            <h2>{stats.completion}%</h2>

            <div className={styles.statFoot}>

              <span>Completed vs. planned</span>

              <div className={styles.miniTrack}>

                <div style={{ width: `${stats.completion}%` }} />

              </div>

            </div>

          </article>

          <article className={styles.statCard}>

            <div className={styles.statTop}>

              <div className={`${styles.statIcon} ${styles.amber}`}>

                <Clock3 size={22} />

              </div>

              <span className={styles.statTag}>Study time</span>

            </div>

            <p className={styles.statLabel}>Actual study hours</p>

            <h2>

              {((analytics?.studyTime.actualMinutes ?? 0) / 60).toFixed(1)}{" "}

              <small>hrs</small>

            </h2>

            <div className={styles.statFoot}>

              <span>{analytics?.studyTime.hasTrackedTime ? `${(analytics.studyTime.plannedMinutes / 60).toFixed(1)} planned hrs` : "No time logged yet"}</span>

              <span className={styles.statAccent}>

                <Activity size={15} />

                {period}

              </span>

            </div>

          </article>

          <article className={styles.statCard}>

            <div className={styles.statTop}>

              <div className={`${styles.statIcon} ${styles.pink}`}>

                <Target size={22} />

              </div>

              <span className={styles.statTag}>Focus</span>

            </div>

            <p className={styles.statLabel}>Overdue tasks</p>

            <h2>{analytics?.summary.overdue ?? 0}</h2>

            <div className={styles.statFoot}>

              <span>{analytics?.summary.pending ?? 0} remaining of {analytics?.summary.total ?? 0}</span>

              <span className={styles.statAccent}>

                <Zap size={15} />

                Stay focused

              </span>

            </div>

          </article>

        </section>

        <section className={styles.mainGrid}>

          <article className={styles.panel}>

            <div className={styles.panelHeading}>

              <div className={styles.panelTitle}>

                <div className={styles.panelIcon}>

                  <BarChart3 size={20} />

                </div>

                <div>

                  <h2>Study activity</h2>

                  <p>Tasks due and completed during each interval</p>

                </div>

              </div>

              <span className={styles.periodBadge}>{period}</span>

            </div>

            <div className={styles.legend}>

              <span>

                <i className={styles.completedDot} />

                Completed

              </span>

              <span>

                <i className={styles.plannedDot} />

                Planned

              </span>

            </div>

            <div

              className={styles.chart}

              role="img"

              aria-label={`${period} study activity: ${stats.completed} completed out of ${stats.planned} planned tasks.`}

            >

              <div className={styles.yLabels} aria-hidden="true">

                <span>{chartMax}</span>

                <span>{Math.round(chartMax * 0.75)}</span>

                <span>{Math.round(chartMax * 0.5)}</span>

                <span>{Math.round(chartMax * 0.25)}</span>

                <span>0</span>

              </div>

              <div className={styles.chartContent}>

                <div className={styles.gridLines} aria-hidden="true">

                  <span />

                  <span />

                  <span />

                  <span />

                  <span />

                </div>

                <div className={styles.bars}>

                  {chartData.map((item) => (

                    <div className={styles.barGroup} key={item.label}>

                      <div className={styles.barPair}>

                        <div

                          className={styles.completedBar}

                          style={{

                            height: `${(item.completed / chartMax) * 100}%`,

                          }}

                          title={`${item.completed} completed`}

                        />

                        <div

                          className={styles.plannedBar}

                          style={{

                            height: `${(item.planned / chartMax) * 100}%`,

                          }}

                          title={`${item.planned} planned`}

                        />

                      </div>

                      <span className={styles.barLabel}>

                        {item.label}

                      </span>

                    </div>

                  ))}

                </div>

              </div>

            </div>

            <div className={styles.chartSummary}>

              <div>

                <i />

                <span>

                  Completed <strong>{stats.completed}</strong> of{" "}

                  <strong>{stats.planned}</strong> planned tasks.

                </span>

              </div>

              <strong className={styles.summaryRate}>

                {stats.completion}% completion

              </strong>

            </div>

          </article>

          <article className={styles.panel}>

            <div className={styles.panelHeading}>

              <div className={styles.panelTitle}>

                <div className={styles.panelIcon}>

                  <PieChart size={20} />

                </div>

                <div>

                  <h2>Tasks by category</h2>

                  <p>Distribution of your workload</p>

                </div>

              </div>

            </div>

            <div className={styles.categoryTotal}>

              <div>

                <span>Tasks due in this period</span>

                <h3>{categoryTotal}</h3>

              </div>

              <div className={styles.categoryTotalIcon}>

                <BookOpen size={22} />

              </div>

            </div>

            <div className={styles.categoryList}>
              {categories.length === 0 && <p className={styles.emptyCopy}>No tasks are due in this period.</p>}

              {categories.map((category) => {

                const percentage = Math.round(

                  (category.count / categoryTotal) * 100

                );

                return (

                  <div

                    className={styles.categoryItem}

                    key={category.name}

                  >

                    <div className={styles.categoryTop}>

                      <span>

                        <i style={{ background: category.color }} />

                        {category.name}

                      </span>

                      <strong>{category.count}</strong>

                    </div>

                    <div className={styles.categoryTrack}>

                      <div

                        style={{

                          width: `${percentage}%`,

                          background: category.color,

                        }}

                      />

                    </div>

                    <span className={styles.categoryCaption}>

                      {percentage}% of period tasks

                    </span>

                  </div>

                );

              })}

            </div>

          </article>

        </section>

        <section className={styles.bottomGrid}>

          <article className={styles.panel}>

            <div className={styles.panelHeading}>

              <div className={styles.panelTitle}>

                <div className={styles.panelIcon}>

                  <Target size={20} />

                </div>

                <div>

                  <h2>Priority breakdown</h2>

                  <p>Where your attention is needed</p>

                </div>

              </div>

            </div>

            <div className={styles.priorityList}>
              {priorities.length === 0 && <p className={styles.emptyCopy}>No task priorities to show for this period.</p>}

              {priorities.map((priority) => {

                const percentage = Math.round(

                  (priority.count / priorityTotal) * 100

                );

                return (

                  <div

                    className={styles.priorityItem}

                    key={priority.name}

                  >

                    <div className={styles.priorityTop}>

                      <span>

                        <i style={{ background: priority.color }} />

                        {priority.name} priority

                      </span>

                      <strong>{priority.count} tasks</strong>

                    </div>

                    <div className={styles.priorityTrack}>

                      <div

                        style={{

                          width: `${percentage}%`,

                          background: priority.color,

                        }}

                      />

                    </div>

                  </div>

                );

              })}

            </div>

            <div className={styles.priorityNote}>

              <Target size={18} />

              <p>

                Review high-priority tasks first, especially when

                their deadlines are approaching.

              </p>

            </div>

          </article>

          <article className={styles.panel}>

            <div className={styles.panelHeading}>

              <div className={styles.panelTitle}>

                <div className={styles.panelIcon}>

                  <Activity size={20} />

                </div>

                <div>

                  <h2>Recent task activity</h2>

                  <p>Latest changes saved to your workspace</p>

                </div>

              </div>

              <Link href="/my-tasks" className={styles.textLink}>

                View all <ArrowRight size={15} />

              </Link>

            </div>

            <div className={styles.activityList}>
              {activities.length === 0 && <p className={styles.emptyCopy}>Your task activity will appear here.</p>}

              {activities.map((item) => {

                const Icon = item.Icon;

                return (

                  <div className={styles.activityItem} key={item.id}>

                    <div

                      className={`${styles.activityIcon} ${styles[item.type]}`}

                    >

                      <Icon size={18} />

                    </div>

                    <div className={styles.activityDetails}>

                      <strong>{item.title}</strong>

                      <span>{item.category ?? (item.action === "deleted" ? "Removed task" : "Task update")}</span>

                    </div>

                    <span

                      className={`${styles.activityStatus} ${styles[item.type]}`}

                    >

                      {item.status}

                    </span>

                  </div>

                );

              })}

            </div>

            <Link href="/add-task" className={styles.secondaryButton}>

              <TrendingUp size={17} />

              Plan your next task

            </Link>

          </article>

        </section>

        <footer className={styles.footer}>

          <div>

            <Zap size={17} />

            <span>Small steps every day create meaningful progress.</span>

          </div>

          <span className={styles.demoNote}>

            Live data · Planned time comes from task estimates; actual time is entered in My Tasks.

          </span>

        </footer>

      </div>

    </main>

  );

}
