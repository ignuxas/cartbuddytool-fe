"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip"; 
import { Pagination } from "@heroui/pagination";
import { config } from "@/lib/config";
import FormattedMessage from "@/app/components/FormattedMessage";
import { useWidgetSettings, useMetricsDashboard } from "@/app/utils/swr";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  daily_stats: Array<{ date: string; count: number; errors: number; widget_opens: number }>;
  hourly_stats: Array<{ hour: string; count: number; widget_opens: number }>;
  top_queries: Array<{ query: string; count: number }>;
  top_pages: Array<{ url: string; title: string; count: number }>;
  interactions_by_mode: Array<{ mode: string; count: number }>;
  recent_metrics: Array<{
    id: string;
    chatInput: string;
    output: string;
    sessionId: string;
    ip: string;
    created_at: string;
    page_title?: string;
    page_url?: string;
  }>;
  // New engagement metrics
  widget_opens: number;
  link_clicks: number;
  suggestion_clicks: number;
  clicked_links: Array<{ url: string; title: string; type: string; count: number }>;
  total_products_recommended: number;
  total_links_recommended: number;
  interactions_with_products: number;
  interactions_with_links: number;
  top_recommended: Array<{ url: string; title: string; type: string; count: number }>;
  product_click_rate: number;
  chat_conversion_rate: number;
}

export default function MetricsPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params.domain as string;
  const { accessToken: authKey } = useAuth();

  // SWR: dashboard metrics (stats, charts, initial recent items)
  const { metrics: dashboardData, isLoading: loading, error: metricsError } = useMetricsDashboard(domain, authKey);
  const { settings: widgetSettings } = useWidgetSettings(domain, authKey);

  // Normalized metrics derived from SWR data
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const error = metricsError?.message || null;

  // Pagination states
  const [interactionsPage, setInteractionsPage] = useState(1);
  const [errorsPage, setErrorsPage] = useState(1);
  const [interactionsTotal, setInteractionsTotal] = useState(0);
  const [errorsTotal, setErrorsTotal] = useState(0);
  const [paginatedInteractions, setPaginatedInteractions] = useState<MetricsData['recent_metrics']>([]);
  const [paginatedErrors, setPaginatedErrors] = useState<MetricsData['recent_errors']>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);

  // Chart configuration state
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const [chartFilters, setChartFilters] = useState({
    daily: { interactions: true, errors: true, opens: true },
    hourly: { interactions: true, opens: true },
  });

  const toggleChartFilter = (chart: 'daily' | 'hourly', key: string) => {
    setChartFilters(prev => ({
      ...prev,
      [chart]: {
        ...prev[chart],
        [key as keyof typeof prev[typeof chart]]: !prev[chart][key as keyof typeof prev[typeof chart]]
      }
    }));
  };

  const ITEMS_PER_PAGE = 10;

  // Sync SWR dashboard data into local state & seed pagination from dashboard
  useEffect(() => {
    if (!dashboardData) return;
    
    const normalizedData = {
      ...dashboardData,
      daily_stats: dashboardData.daily_stats || [],
      hourly_stats: dashboardData.hourly_stats || [],
      top_queries: dashboardData.top_queries || [],
      interactions_by_mode: dashboardData.interactions_by_mode || [],
      top_pages: dashboardData.top_pages || [],
      recent_metrics: dashboardData.recent_metrics || [],
      error_types: dashboardData.error_types || [],
      recent_errors: dashboardData.recent_errors || [],
      total_errors: dashboardData.total_errors || 0,
      error_percentage: dashboardData.error_percentage || 0,
    };
    
    setMetrics(normalizedData);
    
    // Seed page 1 of paginated lists from dashboard data (avoids 2 extra requests)
    if (interactionsPage === 1) {
      setPaginatedInteractions(normalizedData.recent_metrics.slice(0, ITEMS_PER_PAGE));
      setInteractionsTotal(normalizedData.total_interactions);
    }
    if (errorsPage === 1) {
      setPaginatedErrors(normalizedData.recent_errors.slice(0, ITEMS_PER_PAGE));
      setErrorsTotal(normalizedData.total_errors);
    }
  }, [dashboardData]);

  // Function to fetch specific page of interactions
  const fetchInteractionsPage = async (page: number) => {
    if (!authKey) return;
    try {
      setIsLoadingInteractions(true);
      const res = await fetch(
        `${config.serverUrl}/api/metrics/?domain=${encodeURIComponent(domain)}&view=interactions&page=${page}&limit=${ITEMS_PER_PAGE}`,
        { headers: { "Authorization": `Bearer ${authKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setPaginatedInteractions(data.interactions);
        setInteractionsTotal(data.total);
      }
    } catch (e) {
      console.error("Failed to fetch interactions page", e);
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  // Function to fetch specific page of errors
  const fetchErrorsPage = async (page: number) => {
    if (!authKey) return;
    try {
      setIsLoadingErrors(true);
      const res = await fetch(
        `${config.serverUrl}/api/metrics/?domain=${encodeURIComponent(domain)}&view=errors&page=${page}&limit=${ITEMS_PER_PAGE}`,
        { headers: { "Authorization": `Bearer ${authKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setPaginatedErrors(data.errors);
        setErrorsTotal(data.total);
      }
    } catch (e) {
      console.error("Failed to fetch errors page", e);
    } finally {
      setIsLoadingErrors(false);
    }
  };

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
    <div className="flex flex-col gap-6 py-6 transition-all duration-300 ease-in-out">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Engagement Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-cyan-500">
                {metrics.widget_opens || 0}
              </div>
              <div className="text-default-500 mt-1">Widget Opens</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-amber-500">
                {metrics.link_clicks || 0}
              </div>
              <div className="text-default-500 mt-1">Link / Product Clicks</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-indigo-500">
                {metrics.total_products_recommended || 0}
              </div>
              <div className="text-default-500 mt-1">Products Recommended</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-teal-500">
                {metrics.total_links_recommended || 0}
              </div>
              <div className="text-default-500 mt-1">Links Recommended</div>
            </CardBody>
          </Card>
        </div>

        {/* Conversion Rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-emerald-500">
                {metrics.chat_conversion_rate || 0}%
              </div>
              <div className="text-default-500 mt-1">Chat Conversion Rate</div>
              <div className="text-xs text-default-400 mt-0.5">Opens → Messages</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-rose-500">
                {metrics.product_click_rate || 0}%
              </div>
              <div className="text-default-500 mt-1">Click-Through Rate</div>
              <div className="text-xs text-default-400 mt-0.5">Recommended → Clicked</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-sky-500">
                {metrics.suggestion_clicks || 0}
              </div>
              <div className="text-default-500 mt-1">Suggestion Clicks</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <div className="text-3xl font-bold text-violet-500">
                {metrics.interactions_with_products || 0}
              </div>
              <div className="text-default-500 mt-1">Chats with Products</div>
              <div className="text-xs text-default-400 mt-0.5">
                {metrics.total_interactions > 0 
                  ? `${((metrics.interactions_with_products || 0) / metrics.total_interactions * 100).toFixed(1)}% of all chats`
                  : '—'
                }
              </div>
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
        <div className={`grid grid-cols-1 ${fullscreenChart ? '' : 'lg:grid-cols-2'} gap-6 mb-6`}>
          {/* Daily Activity Chart */}
          <Card className={fullscreenChart === 'daily' ? "fixed inset-0 z-50 m-0 h-screen w-screen" : (fullscreenChart ? "hidden" : "")}>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-4 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                <h3 className="text-xl font-semibold whitespace-nowrap">Daily Activity</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    radius="full"
                    variant={chartFilters.daily.interactions ? "solid" : "bordered"}
                    color="primary"
                    onPress={() => toggleChartFilter('daily', 'interactions')}
                    className="min-h-7 h-7 text-xs font-medium"
                  >
                    Interactions
                  </Button>
                  <Button 
                    size="sm" 
                    radius="full"
                    variant={chartFilters.daily.opens ? "solid" : "bordered"} 
                    color="secondary"
                    onPress={() => toggleChartFilter('daily', 'opens')}
                    className="min-h-7 h-7 text-xs font-medium"
                  >
                    Widget Opens
                  </Button>
                  <Button 
                    size="sm" 
                    radius="full"
                    variant={chartFilters.daily.errors ? "solid" : "bordered"} 
                    color="danger"
                    onPress={() => toggleChartFilter('daily', 'errors')}
                    className="min-h-7 h-7 text-xs font-medium"
                  >
                    Errors
                  </Button>
                </div>
              </div>
              <Button 
                isIconOnly 
                variant="light" 
                size="sm"
                className="absolute top-4 right-4 sm:static"
                onPress={() => setFullscreenChart(fullscreenChart === 'daily' ? null : 'daily')}
              >
                {fullscreenChart === 'daily' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
              </Button>
            </CardHeader>
            <CardBody className={fullscreenChart === 'daily' ? "h-[calc(100vh-100px)]" : ""}>
              {metrics.daily_stats.length > 0 ? (
                <ResponsiveContainer width="100%" height={fullscreenChart === 'daily' ? "100%" : 300}>
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
                    {chartFilters.daily.interactions && (
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        name="Total Interactions"
                      />
                    )}
                    {chartFilters.daily.opens && (
                      <Line
                        type="monotone"
                        dataKey="widget_opens"
                        stroke="#06B6D4"
                        strokeWidth={2}
                        name="Widget Opens"
                        strokeDasharray="5 5"
                      />
                    )}
                    {chartFilters.daily.errors && (
                      <Line
                        type="monotone"
                        dataKey="errors"
                        stroke="#EF4444"
                        strokeWidth={2}
                        name="Errors"
                      />
                    )}
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
          <Card className={fullscreenChart === 'hourly' ? "fixed inset-0 z-50 m-0 h-screen w-screen" : (fullscreenChart ? "hidden" : "")}>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-4 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                <h3 className="text-xl font-semibold whitespace-nowrap">Hourly Distribution</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    radius="full"
                    variant={chartFilters.hourly.interactions ? "solid" : "bordered"} 
                    color="success"
                    onPress={() => toggleChartFilter('hourly', 'interactions')}
                    className="min-h-7 h-7 text-xs font-medium"
                  >
                    Interactions
                  </Button>
                  <Button 
                    size="sm" 
                    radius="full"
                    variant={chartFilters.hourly.opens ? "solid" : "bordered"} 
                    color="secondary"
                    onPress={() => toggleChartFilter('hourly', 'opens')}
                    className="min-h-7 h-7 text-xs font-medium"
                  >
                    Widget Opens
                  </Button>
                </div>
              </div>
              <Button 
                isIconOnly 
                variant="light" 
                size="sm"
                className="absolute top-4 right-4 sm:static"
                onPress={() => setFullscreenChart(fullscreenChart === 'hourly' ? null : 'hourly')}
              >
                 {fullscreenChart === 'hourly' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
              </Button>
            </CardHeader>
            <CardBody className={fullscreenChart === 'hourly' ? "h-[calc(100vh-100px)]" : ""}>
              {metrics.hourly_stats.length > 0 ? (
                <ResponsiveContainer width="100%" height={fullscreenChart === 'hourly' ? "100%" : 300}>
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
                    {chartFilters.hourly.interactions && (
                      <Bar dataKey="count" fill="#10B981" name="Interactions" />
                    )}
                    {chartFilters.hourly.opens && (
                      <Bar dataKey="widget_opens" fill="#06B6D4" name="Widget Opens" />
                    )}
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

        {/* Top Queries, Top Pages and Error Analysis */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${metrics.total_errors > 0 ? 'lg:grid-cols-3' : ''} gap-6 mb-6`}>
          {/* Top Queries */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold">Top User Queries</h3>
            </CardHeader>
            <CardBody>
              {metrics.top_queries && metrics.top_queries.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {metrics.top_queries.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                    >
                      <div className="flex-1 mr-4">
                        <div className="text-sm font-medium text-foreground truncate" title={item.query}>
                          {item.query}
                        </div>
                      </div>
                      <Chip size="sm" color="primary" variant="flat">
                        {item.count}
                      </Chip>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-default-500 py-12">
                  No query data available
                </div>
              )}
            </CardBody>
          </Card>

          {/* Top Pages */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold">Top Pages</h3>
            </CardHeader>
            <CardBody>
              {metrics.top_pages && metrics.top_pages.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {metrics.top_pages.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                    >
                      <div className="flex-1 mr-4">
                         <div className="text-sm font-medium text-foreground truncate" title={item.title}>
                          {item.title || item.url}
                        </div>
                        {item.title && (
                             <div className="text-xs text-default-500 truncate" title={item.url}>
                              {item.url}
                            </div>
                        )}
                      </div>
                      <Chip size="sm" color="secondary" variant="flat">
                        {item.count}
                      </Chip>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-default-500 py-12">
                  No page data available
                </div>
              )}
            </CardBody>
          </Card>

          {/* Error Types Distribution - Only if errors exist */}
          {metrics.total_errors > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-xl font-semibold">Error Types Distribution</h3>
              </CardHeader>
              <CardBody>
                {metrics.error_types && metrics.error_types.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {metrics.error_types.map((errorType, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                      >
                        <div className="flex-1 mr-4">
                          <div className="text-sm font-medium text-foreground truncate" title={errorType.error_type}>
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
          )}
        </div>

        {/* Engagement: Clicked Links & Top Recommended */}
        {((metrics.clicked_links && metrics.clicked_links.length > 0) || (metrics.top_recommended && metrics.top_recommended.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Most Clicked Links */}
          {metrics.clicked_links && metrics.clicked_links.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold">Most Clicked Links</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {metrics.clicked_links.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                  >
                    <div className="flex-1 mr-4 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Chip size="sm" variant="flat" color={item.type === 'product_card' ? 'success' : item.type === 'link_card' ? 'warning' : 'default'}>
                          {item.type === 'product_card' ? 'Product' : item.type === 'link_card' ? 'Link Card' : 'Link'}
                        </Chip>
                      </div>
                      <div className="text-sm font-medium text-foreground truncate" title={item.title || item.url}>
                        {item.title || 'Untitled'}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-600 truncate block"
                        title={item.url}
                      >
                        {item.url}
                      </a>
                    </div>
                    <Chip size="sm" color="warning" variant="flat" className="flex-shrink-0">
                      {item.count} clicks
                    </Chip>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
          )}

          {/* Top Recommended (by AI) */}
          {metrics.top_recommended && metrics.top_recommended.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold">Top Recommended by AI</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {metrics.top_recommended.map((item, idx) => {
                  // Find matching click data
                  const clickData = metrics.clicked_links?.find(c => c.url === item.url);
                  const clickCount = clickData?.count || 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                    >
                      <div className="flex-1 mr-4 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Chip size="sm" variant="flat" color={item.type === 'product' ? 'success' : 'secondary'}>
                            {item.type === 'product' ? 'Product' : 'Link'}
                          </Chip>
                        </div>
                        <div className="text-sm font-medium text-foreground truncate" title={item.title || item.url}>
                          {item.title || 'Untitled'}
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-600 truncate block"
                          title={item.url}
                        >
                          {item.url}
                        </a>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Chip size="sm" color="primary" variant="flat">
                          {item.count}x shown
                        </Chip>
                        {clickCount > 0 && (
                          <Chip size="sm" color="warning" variant="flat">
                            {clickCount} clicks
                          </Chip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
          )}
        </div>
        )}

        {/* Recent Items Grid */}
        <div className={`grid grid-cols-1 ${paginatedErrors && paginatedErrors.length > 0 ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* Recent Errors */}
          {paginatedErrors && paginatedErrors.length > 0 && (
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-red-500">Recent Errors</h3>
                {errorsTotal > ITEMS_PER_PAGE && (
                  <Chip size="sm" variant="flat" color="danger">
                    {errorsTotal} Total
                  </Chip>
                )}
              </CardHeader>
              <CardBody>
                <div className={`space-y-4 ${isLoadingErrors ? 'opacity-50' : ''} max-h-[600px] overflow-y-auto pr-2`}>
                  {paginatedErrors.map((error) => (
                    <div
                      key={error.id}
                      className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-red-200 dark:border-red-900"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Chip size="sm" variant="flat" color="danger">
                              ID: {error.id}
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
                      
                      <div className="grid grid-cols-1 gap-3 mb-3">
                        <div className="space-y-2">
                          {error.last_node_executed && error.last_node_executed !== '-' && (
                            <div>
                              <div className="text-xs font-semibold text-default-600 mb-1">
                                Last Node:
                              </div>
                              <div className="text-xs text-default-500 bg-content2 p-2 rounded">
                                {error.last_node_executed}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {error.execution_url && error.execution_url !== '-' && (
                            <div>
                              <div className="text-xs font-semibold text-default-600 mb-1">
                                URL:
                              </div>
                              <a
                                href={error.execution_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-600 underline break-all block"
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
                            Stack:
                          </div>
                          <div className="text-xs text-default-500 bg-content2 p-2 rounded max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                            {error.error_stack}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {errorsTotal > ITEMS_PER_PAGE && (
                  <div className="flex justify-center mt-4">
                     <Pagination 
                        total={Math.ceil(errorsTotal / ITEMS_PER_PAGE)}
                        initialPage={1}
                        page={errorsPage}
                        onChange={(page) => {
                          setErrorsPage(page);
                          fetchErrorsPage(page);
                        }}
                        size="sm"
                        color="danger"
                     />
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Recent Interactions */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Recent Interactions</h3>
              {interactionsTotal > ITEMS_PER_PAGE && (
                <Chip size="sm" variant="flat" color="primary">
                  {interactionsTotal} Total
                </Chip>
              )}
            </CardHeader>
            <CardBody>
              {paginatedInteractions.length > 0 ? (
                <>
                <div className={`space-y-4 ${isLoadingInteractions ? 'opacity-50' : ''} max-h-[600px] overflow-y-auto pr-2`}>
                  {paginatedInteractions.map((metric) => (
                    <div
                      key={metric.id}
                      className="p-4 bg-default-100 rounded-lg border border-default-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-xs text-default-500">
                          {formatDateTime(metric.created_at)}
                        </div>
                        <div className="flex gap-2">
                           {(metric.page_title || metric.page_url) && (
                            <Chip size="sm" variant="flat" color="warning" className="max-w-[200px]" title={metric.page_url}>
                               <span className="truncate block">
                                  {metric.page_title || metric.page_url}
                               </span>
                            </Chip>
                          )}
                          {metric.sessionId !== "-" && (
                            <Chip size="sm" variant="flat" color="secondary">
                              {metric.sessionId.slice(0, 8)}...
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
                        {/* eslint-disable-next-line */}
                        <div 
                          className="p-3 rounded-lg max-h-64 overflow-y-auto"
                          style={{ backgroundColor: widgetSettings?.background_color || '#f4f4f5' }}
                        >
                          {metric.output !== "-" ? (
                             <FormattedMessage content={metric.output} />
                          ) : (
                             <span className="text-default-500 text-sm">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {interactionsTotal > ITEMS_PER_PAGE && (
                  <div className="flex justify-center mt-4">
                     <Pagination 
                        total={Math.ceil(interactionsTotal / ITEMS_PER_PAGE)}
                        initialPage={1}
                        page={interactionsPage}
                        onChange={(page) => {
                          setInteractionsPage(page);
                          fetchInteractionsPage(page);
                        }}
                        size="sm"
                        color="primary"
                     />
                  </div>
                )}
                </>
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
