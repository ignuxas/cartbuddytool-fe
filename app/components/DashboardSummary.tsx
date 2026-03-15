"use client";

import React, { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MoveRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { useMetricsSummary } from "@/app/utils/swr";

interface MetricsSummary {
  total_interactions: number;
  monthly_interactions: number;
  total_errors: number;
  monthly_errors?: number;
  unique_sessions: number;
  unique_ips: number;
  project_count: number;
  widget_opens: number;
  monthly_opens?: number;
  total_link_clicks: number;
  monthly_link_clicks?: number;
  daily_interactions: { date: string; value: number }[];
  daily_opens: { date: string; value: number }[];
}

export default function DashboardSummary({
  authKey,
  isAdmin = false,
}: {
  authKey: string | null;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  const { summary, isLoading: loading } = useMetricsSummary(authKey);
  const data = summary as MetricsSummary | null;

  const chartData = useMemo(() => {
    if (!data) return [];

    return data.daily_interactions.map((interaction) => {
      const openData = data.daily_opens.find(
        (o) => o.date === interaction.date,
      );

      return {
        date: interaction.date,
        chats: interaction.value,
        opens: openData ? openData.value : 0,
      };
    });
  }, [data]);

  if (loading || !data) {
    return (
      <div className="w-full flex-col gap-6 animate-pulse hidden md:flex">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-32 bg-default-100" />
          ))}
        </div>
        <Card className="h-80 bg-default-100" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Chats",
      value: data.total_interactions.toLocaleString(),
      change: `+${data.monthly_interactions} this month`,
      trend: data.monthly_interactions > 0 ? "up" : "neutral",
    },
    {
      title: "Widget Opens",
      value: data.widget_opens.toLocaleString(),
      change:
        data.monthly_opens !== undefined
          ? `+${data.monthly_opens} this month`
          : "Lifetime opens",
      trend: (data.monthly_opens || 0) > 0 ? "up" : "neutral",
    },
    {
      title: "Link Clicks",
      value: (data.total_link_clicks || 0).toLocaleString(),
      change:
        data.monthly_link_clicks !== undefined
          ? `+${data.monthly_link_clicks} this month`
          : "Lifetime clicks",
      trend: (data.monthly_link_clicks || 0) > 0 ? "up" : "neutral",
    },
    {
      title: "Chat Conversion",
      value:
        data.widget_opens > 0
          ? `${((data.total_interactions / data.widget_opens) * 100).toFixed(1)}%`
          : "0%",
      change: "Opens to chats",
      trend: "neutral",
    },
    {
      title: "Unique Users",
      value: data.unique_ips.toLocaleString(),
      change: "Across all projects",
      trend: "up",
    },
  ];

  if (isAdmin) {
    statCards.push(
      {
        title: "Total Errors",
        value: data.total_errors.toLocaleString(),
        change:
          data.monthly_errors !== undefined
            ? `${data.monthly_errors} this month`
            : "System wide",
        trend: data.total_errors > 0 ? "down" : "neutral",
      },
      {
        title: "Unique Sessions",
        value: data.unique_sessions.toLocaleString(),
        change: "Total tracked sessions",
        trend: "neutral",
      },
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Stats Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${isAdmin ? "xl:grid-cols-4 2xl:grid-cols-7" : "xl:grid-cols-5"} gap-4 w-full`}
      >
        {statCards.map((stat, i) => (
          <Card
            key={i}
            className="bg-background shadow-sm border border-content2"
          >
            <CardBody className="flex flex-col justify-center px-6 py-5 gap-2">
              <span className="text-sm font-medium text-default-500">
                {stat.title}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{stat.value}</span>
              </div>
              <span
                className={`text-xs mt-1 ${
                  stat.trend === "up"
                    ? "text-success"
                    : stat.trend === "down"
                      ? "text-danger"
                      : "text-default-400"
                }`}
              >
                {stat.change}
              </span>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-4 w-full">
        {/* Chart */}
        <Card className="flex-grow bg-background shadow-sm border border-content2">
          <CardHeader className="px-6 pt-6 pb-2 flex flex-col items-start">
            <h4 className="text-lg font-semibold">Usage Overview</h4>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-default-500">Chats</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-secondary" />
                <span className="text-xs text-default-500">Widget Opens</span>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-0 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  opacity={0.2}
                  stroke="#333"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  allowDuplicatedCategory={false}
                  axisLine={false}
                  dataKey="date"
                  tick={{
                    fontSize: 12,
                    fill: "hsl(var(--heroui-default-500))",
                  }}
                  tickFormatter={(val) => {
                    if (!val) return "";
                    const d = new Date(val);

                    return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
                  }}
                  tickLine={false}
                  type="category"
                />
                <YAxis
                  axisLine={false}
                  tick={{
                    fontSize: 12,
                    fill: "hsl(var(--heroui-default-500))",
                  }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  labelFormatter={(val) => {
                    const d = new Date(val as string);

                    return `${d.getDate()} ${d.toLocaleString("default", { month: "long", year: "numeric" })}`;
                  }}
                />
                <Bar
                  dataKey="chats"
                  fill="hsl(var(--heroui-primary))"
                  maxBarSize={30}
                  name="Chats"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="opens"
                  fill="hsl(var(--heroui-secondary))"
                  maxBarSize={30}
                  name="Widget Opens"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Promo / Action Card */}
        <Card className="w-full lg:w-80 bg-primary text-primary-foreground shadow-sm flex-shrink-0">
          <CardBody className="flex flex-col justify-center p-8 gap-6 h-full text-center items-center">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">Need more power?</h3>
              <p className="text-primary-foreground/80 text-sm">
                Upgrade to a higher plan to increase your chat limits and deploy
                widgets to more domains.
              </p>
            </div>
            <Button
              className="bg-white text-primary font-bold shadow-md w-full max-w-[200px]"
              endContent={<MoveRight size={16} />}
              onPress={() => router.push("/pricing")}
            >
              View Pricing
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
