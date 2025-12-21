"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { config } from "@/lib/config";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MetricsData {
  domain: string;
  total_interactions: number;
  unique_sessions: number;
  unique_ips: number;
  average_response_length: number;
  total_errors: number;
  error_percentage: number;
  error_types: Array<{ error_type: string; count: number }>;
  recent_errors: Array<{
    id: string;
    date: string;
    domain: string;
    error_message: string;
    error_stack: string;
    last_node_executed: string;
    execution_url: string;
    mode: string;
    retryOf: string;
  }>;
  daily_stats: Array<{ date: string; count: number; errors: number }>;
  hourly_stats: Array<{ hour: string; count: number }>;
  top_queries: Array<{ query: string; count: number }>;
  interactions_by_mode: Array<{ mode: string; count: number }>;
  recent_metrics: Array<{
    id: string;
    chatInput: string;
    output: string;
    sessionId: string;
    ip: string;
    created_at: string;
  }>;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6B9D",
  "#C9A0DC",
  "#20B2AA",
];

export default function MetricsPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params.domain as string;
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth key from cookie
        const getCookie = (name: string): string | null => {
          if (typeof document === 'undefined') return null;
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
          return null;
        };
        
        const authKey = getCookie('cartbuddy_auth_key');

        if (!authKey) {
          setError("Not authenticated. Please log in.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${config.serverUrl}/api/metrics/?domain=${encodeURIComponent(domain)}`,
          {
            headers: {
              "X-Auth-Key": authKey,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Ensure all arrays are initialized to prevent null/undefined errors
        const normalizedData = {
          ...data,
          daily_stats: data.daily_stats || [],
          hourly_stats: data.hourly_stats || [],
          top_queries: data.top_queries || [],
          interactions_by_mode: data.interactions_by_mode || [],
          recent_metrics: data.recent_metrics || [],
          error_types: data.error_types || [],
          recent_errors: data.recent_errors || [],
          total_errors: data.total_errors || 0,
          error_percentage: data.error_percentage || 0,
        };
        
        setMetrics(normalizedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    };

    if (domain) {
      fetchMetrics();
    }
  }, [domain]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2 text-foreground">Loading metrics...</div>
          <div className="text-default-500">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardBody className="text-center">
            <div className="text-xl font-semibold mb-2 text-danger">Error</div>
            <div className="text-default-500 mb-4">{error}</div>
            <Button color="primary" onPress={() => router.back()}>
              Go Back
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button
              size="sm"
              variant="light"
              onPress={() => router.back()}
              className="mb-2"
            >
              ← Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">
              Metrics Dashboard
            </h1>
            <p className="text-default-500 mt-1">{domain}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-blue-500">
                {metrics.total_interactions}
              </div>
              <div className="text-default-500 mt-1">Total Interactions</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-green-500">
                {metrics.unique_sessions}
              </div>
              <div className="text-default-500 mt-1">Unique Sessions</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-purple-500">
                {metrics.unique_ips}
              </div>
              <div className="text-default-500 mt-1">Unique IPs</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-orange-500">
                {metrics.average_response_length.toFixed(0)}
              </div>
              <div className="text-default-500 mt-1">Avg Response Length</div>
            </CardBody>
          </Card>
        </div>

        {/* Error Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-red-500">
                {metrics.total_errors || 0}
              </div>
              <div className="text-default-500 mt-1">Total Errors</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-red-400">
                {(metrics.error_percentage || 0).toFixed(2)}%
              </div>
              <div className="text-default-500 mt-1">Error Rate</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-green-400">
                {((100 - (metrics.error_percentage || 0))).toFixed(2)}%
              </div>
              <div className="text-default-500 mt-1">Success Rate</div>
            </CardBody>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold">Daily Activity</h3>
            </CardHeader>
            <CardBody>
              {metrics.daily_stats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.daily_stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9CA3AF"
                      tickFormatter={(value: any) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      labelFormatter={(value: any) => formatDate(value)}
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Total Interactions"
                    />
                    <Line
                      type="monotone"
                      dataKey="errors"
                      stroke="#EF4444"
                      strokeWidth={2}
                      name="Errors"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-default-500 py-12">
                  No daily activity data available
                </div>
              )}
            </CardBody>
          </Card>

          {/* Hourly Distribution Chart */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold">Hourly Distribution</h3>
            </CardHeader>
            <CardBody>
              {metrics.hourly_stats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.hourly_stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#10B981" name="Interactions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-default-500 py-12">
                  No hourly data available
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Error Analysis Row */}
        {metrics.total_errors > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Error Types Distribution */}
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Error Types Distribution</h3>
              </CardHeader>
              <CardBody>
                {metrics.error_types && metrics.error_types.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.error_types.map((errorType, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                      >
                        <div className="flex-1 mr-4">
                          <div className="text-sm font-medium text-foreground truncate">
                            {errorType.error_type}
                          </div>
                        </div>
                        <Chip size="sm" color="danger" variant="flat">
                          {errorType.count}
                        </Chip>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-default-500 py-12">
                    No error type data available
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Daily Activity with Errors */}
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Daily Activity with Errors</h3>
              </CardHeader>
              <CardBody>
                {metrics.daily_stats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.daily_stats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        tickFormatter={(value: any) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip
                        labelFormatter={(value: any) => formatDate(value)}
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '6px',
                          color: '#F3F4F6'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        name="Total Interactions"
                      />
                      <Line
                        type="monotone"
                        dataKey="errors"
                        stroke="#EF4444"
                        strokeWidth={2}
                        name="Errors"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-default-500 py-12">
                    No daily activity data available
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Interactions by Mode */}
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-xl font-semibold">Interactions by Mode</h3>
          </CardHeader>
          <CardBody>
            {metrics.interactions_by_mode.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {metrics.interactions_by_mode.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                    >
                      <div className="flex-1 mr-4">
                        <div className="text-sm font-medium text-foreground truncate">
                          {item.mode}
                        </div>
                      </div>
                      <Chip size="sm" color="primary" variant="flat">
                        {item.count}
                      </Chip>
                    </div>
                  ))}
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metrics.interactions_by_mode}
                        dataKey="count"
                        nameKey="mode"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry: any) => `${entry.count}`}
                      >
                        {metrics.interactions_by_mode.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '6px',
                          color: '#F3F4F6'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center text-default-500 py-12">
                No mode data available
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Errors */}
        {metrics.recent_errors && metrics.recent_errors.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-xl font-semibold text-red-500">Recent Errors</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {metrics.recent_errors.map((error) => (
                  <div
                    key={error.id}
                    className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-red-200 dark:border-red-900"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Chip size="sm" variant="flat" color="danger">
                            Error ID: {error.id}
                          </Chip>
                          <div className="text-xs text-default-500">
                            {formatDateTime(error.date)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                          {error.error_message}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="space-y-2">
                        {error.last_node_executed && error.last_node_executed !== '-' && (
                          <div>
                            <div className="text-xs font-semibold text-default-600 mb-1">
                              Last Node Executed:
                            </div>
                            <div className="text-xs text-default-500 bg-content2 p-2 rounded">
                              {error.last_node_executed}
                            </div>
                          </div>
                        )}
                        {error.mode && error.mode !== '-' && (
                          <div>
                            <div className="text-xs font-semibold text-default-600 mb-1">
                              Execution Mode:
                            </div>
                            <Chip size="sm" variant="flat" color="default">
                              {error.mode}
                            </Chip>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {error.retryOf && error.retryOf !== '-' && (
                          <div>
                            <div className="text-xs font-semibold text-default-600 mb-1">
                              Retry Of:
                            </div>
                            <Chip size="sm" variant="flat" color="warning">
                              Execution #{error.retryOf}
                            </Chip>
                          </div>
                        )}
                        {error.execution_url && error.execution_url !== '-' && (
                          <div>
                            <div className="text-xs font-semibold text-default-600 mb-1">
                              Execution URL:
                            </div>
                            <a
                              href={error.execution_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-600 underline break-all"
                            >
                              {error.execution_url}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {error.error_stack && error.error_stack !== '' && (
                      <div>
                        <div className="text-xs font-semibold text-default-600 mb-1">
                          Stack Trace:
                        </div>
                        <div className="text-xs text-default-500 bg-content2 p-2 rounded max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                          {error.error_stack}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Recent Interactions */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Recent Interactions</h3>
          </CardHeader>
          <CardBody>
            {metrics.recent_metrics.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {metrics.recent_metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="p-4 bg-default-100 rounded-lg border border-default-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs text-default-500">
                        {formatDateTime(metric.created_at)}
                      </div>
                      <div className="flex gap-2">
                        {metric.sessionId !== "-" && (
                          <Chip size="sm" variant="flat" color="secondary">
                            Session: {metric.sessionId.slice(0, 8)}...
                          </Chip>
                        )}
                        {metric.ip !== "-" && (
                          <Chip size="sm" variant="flat" color="default">
                            {metric.ip}
                          </Chip>
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="text-sm font-semibold text-foreground mb-1">
                        Input:
                      </div>
                      <div className="text-sm text-default-600 bg-content2 p-2 rounded">
                        {metric.chatInput !== "-" ? metric.chatInput : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground mb-1">
                        Output:
                      </div>
                      <div className="text-sm text-default-600 bg-content2 p-2 rounded max-h-32 overflow-y-auto">
                        {metric.output !== "-" ? metric.output : "N/A"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-default-500 py-12">
                No recent interactions available
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
