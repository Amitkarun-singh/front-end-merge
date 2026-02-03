import { useEffect, useState } from "react";
import LoadingScreen from "@/pages/components/LoadingScreen";
import {
  BarChart3,
  Clock,
  HelpCircle,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Optional: colors for subjects
const SUBJECT_COLORS = {
  Math: "hsl(262, 83%, 58%)",
  Science: "hsl(187, 96%, 42%)",
  English: "hsl(330, 80%, 65%)",
  Other: "hsl(160, 60%, 50%)",
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function PerformancePage() {
  const [summary, setSummary] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [subjectMastery, setSubjectMastery] = useState([]);
  const [latestTests, setLatestTests] = useState([]);
  const [weeklyTime, setWeeklyTime] = useState({
    hours: 0,
    percentageChange: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("http://localhost:3000/student/performance/1");
        const json = await res.json();

        if (json.success) {
          const data = json.data;

          // Summary
          setSummary({
            overallScore: data.summary.overallScore,
            totalTimeMinutes: data.summary.totalTimeMinutes,
            totalQuestions: data.summary.totalQuestions,
            totalTests: data.summary.totalTests,
          });

          // Progress Chart
          const monthMap = {};
          data.progressChart.forEach((item) => {
            const month = MONTH_NAMES[item.month - 1] || `Month ${item.month}`;
            if (!monthMap[month]) monthMap[month] = {};
            monthMap[month][item.subject_name.toLowerCase()] = Number(
              item.score_percentage,
            );
          });

          setProgressData(
            Object.keys(monthMap).map((month) => ({
              month,
              math: monthMap[month].math || 0,
              science: monthMap[month].science || 0,
              english: monthMap[month].english || 0,
            })),
          );

          // Subject Mastery
          setSubjectMastery(
            data.subjectMastery.map((item) => ({
              name: item.label,
              value: Number(item.value),
              color: SUBJECT_COLORS[item.label] || "gray",
            })),
          );

          // Latest Tests
          setLatestTests(
            data.latestTests.map((test) => {
              let colorClass = "bg-primary";
              if (test.score >= 70) colorClass = "bg-primary";
              else if (test.score >= 40) colorClass = "bg-secondary";
              else colorClass = "bg-destructive";
              return { ...test, color: colorClass };
            }),
          );

          // Weekly Time
          setWeeklyTime(data.weeklyTime);
        }
      } catch (err) {
        console.error("Failed to fetch student performance:", err);
      }
    }

    fetchData();
  }, []);

  if (!summary) return <LoadingScreen />;

  const totalHours = Math.floor(Number(summary.totalTimeMinutes) / 60);
  const totalMinutes = Number(summary.totalTimeMinutes) % 60;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Student Performance
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome, Student Name • Date: January 18, 2026
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Overall Score"
            value={`${summary.overallScore}%`}
            icon={BarChart3}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <StatsCard
            title="Time Spent"
            value={`${totalHours}h ${totalMinutes}m`}
            icon={Clock}
            iconBg="bg-secondary/10"
            iconColor="text-secondary"
          />
          <StatsCard
            title="Questions"
            value={summary.totalQuestions}
            icon={HelpCircle}
            iconBg="bg-chart-3/10"
            iconColor="text-chart-3"
          />
          <StatsCard
            title="Tests"
            value={summary.totalTests}
            icon={ClipboardList}
            iconBg="bg-chart-4/10"
            iconColor="text-chart-4"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Progress Chart */}
          <div className="edtech-card">
            <h3 className="font-semibold text-foreground mb-4">My Progress</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="math"
                    fill={SUBJECT_COLORS.Math}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="science"
                    fill={SUBJECT_COLORS.Science}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="english"
                    fill={SUBJECT_COLORS.English}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subject Mastery Pie */}
          <div className="edtech-card">
            <h3 className="font-semibold text-foreground mb-4">
              Subject-wise Mastery
            </h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjectMastery}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ value }) => `${value}%`}
                  >
                    {subjectMastery.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {subjectMastery.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Tests */}
          <div className="edtech-card">
            <h3 className="font-semibold text-foreground mb-4">Latest Tests</h3>
            <div className="space-y-4">
              {latestTests.map((test, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {test.subject}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          test.score >= 70
                            ? "text-chart-4"
                            : test.score >= 40
                              ? "text-chart-5"
                              : "text-destructive"
                        }`}
                      >
                        {test.score}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${test.color} transition-all`}
                        style={{ width: `${test.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Spent */}
          <div className="edtech-card">
            <h3 className="font-semibold text-foreground mb-4">
              Time Spent per Week
            </h3>
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto rounded-full border-4 border-primary flex items-center justify-center mb-3">
                  <Clock className="w-10 h-10 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {weeklyTime.hours} hours
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-chart-4">
              <TrendingUp className="w-4 h-4" />
              <span>+{weeklyTime.percentageChange}% from last week</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
