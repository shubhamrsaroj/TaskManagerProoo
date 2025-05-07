'use client';

import React, { useState, useEffect } from 'react';
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';
import { FiBarChart2, FiPieChart, FiTrendingUp, FiClock, FiUsers, FiCheckCircle, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

// Create a custom spinner component since Chakra's Spinner is not available
const Spinner = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    p={8}
  >
    <Box
      as={FiLoader}
      size="40px"
      color="blue.500"
      animation="spin 1s linear infinite"
    />
    <style jsx global>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </Box>
);

// Analytics data interface
interface AnalyticsData {
  taskCompletion: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    rate: number;
    change: number;
  };
  userActivity: {
    activeUsers: number;
    tasksPerUser: number;
    topUser: string | null;
  };
  timeMetrics: {
    avgCompletionTime: string;
    onTimeRate: number;
    change: number;
  };
  distribution: {
    status: {
      completed: number;
      'in-progress': number;
      todo: number;
    };
    priority: {
      [key: string]: number;
    };
  };
}

// User performance interface
interface UserPerformance {
  userId: string;
  name: string;
  tasksCompleted: number;
}

// Completion trend interface
interface CompletionTrend {
  weekLabel: string;
  completedTasks: number;
  completionRate: number;
}

export default function ReportsPage() {
  const [userData, setUserData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([]);
  const [completionTrend, setCompletionTrend] = useState<CompletionTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get user data and analytics
  useEffect(() => {
    const user = getUser();
    if (user) {
      setUserData(user);
      
      // Fetch analytics data if the user is admin or manager
      if (user.role === 'admin' || user.role === 'manager') {
        fetchAllAnalytics();
      } else {
        setLoading(false);
      }
    }
  }, []);
  
  // Fetch all analytics data from the API
  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch summary data
      const summaryResponse = await api.get('/tasks/analytics/summary');
      setAnalyticsData(summaryResponse.data);
      
      // Fetch user performance data
      const performanceResponse = await api.get('/tasks/analytics/user-performance');
      setUserPerformance(performanceResponse.data);
      
      // Fetch completion trend data
      const trendResponse = await api.get('/tasks/analytics/completion-trend');
      setCompletionTrend(trendResponse.data);
      
      setError(null);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // If user is not admin or manager, show access denied
  if (userData && userData.role !== 'admin' && userData.role !== 'manager') {
    return (
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6}>Reports & Analytics</Heading>
        <Box p={5} borderRadius="md" borderLeft="4px solid" borderLeftColor="red.500" bg="red.50">
          <Heading size="md" color="red.600" mb={2}>Access Denied</Heading>
          <Text color="red.600">
            You don't have sufficient permissions to view the analytics data.
            Please contact your administrator for access.
          </Text>
        </Box>
      </Container>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6}>Reports & Analytics</Heading>
        <Spinner />
      </Container>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6}>Reports & Analytics</Heading>
        <Box p={5} borderRadius="md" borderLeft="4px solid" borderLeftColor="orange.500" bg="orange.50">
          <Heading size="md" color="orange.600" mb={2} display="flex" alignItems="center">
            <FiAlertTriangle style={{ marginRight: '8px' }} />
            Error Loading Data
          </Heading>
          <Text color="orange.600">{error}</Text>
          <Text mt={3} color="orange.700">Please try again later or contact support if the issue persists.</Text>
        </Box>
      </Container>
    );
  }
  
  // If no data is available yet
  if (!analyticsData) {
    return (
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6}>Reports & Analytics</Heading>
        <Box p={5} borderRadius="md" borderWidth="1px" bg="gray.50">
          <Text>No analytics data available. Start creating tasks to generate reports.</Text>
        </Box>
      </Container>
    );
  }

  // Prepare user performance data for visualization
  const userPerformanceData = userPerformance.map((user, index) => ({
    label: user.name,
    value: user.tasksCompleted,
    color: getColorForIndex(index)
  }));

  // Prepare trend data for visualization
  const trendData = {
    labels: completionTrend.map(week => week.weekLabel),
    values: completionTrend.map(week => week.completionRate)
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading size="lg" mb={6}>Reports & Analytics</Heading>
      
      {/* Section: Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard 
          title="Task Completion" 
          value={`${analyticsData.taskCompletion.completed}/${analyticsData.taskCompletion.total}`}
          description={`${analyticsData.taskCompletion.rate}% completion rate`}
          icon={<FiCheckCircle size={20} />}
          change={analyticsData.taskCompletion.change}
          color="#3182CE"
        />
        
        <StatCard 
          title="User Activity" 
          value={`${analyticsData.userActivity.activeUsers} active users`}
          description={`Avg ${analyticsData.userActivity.tasksPerUser} tasks per user`}
          secondaryInfo={analyticsData.userActivity.topUser ? `Top performer: ${analyticsData.userActivity.topUser}` : undefined}
          icon={<FiUsers size={20} />}
          color="#805AD5"
        />
        
        <StatCard 
          title="Time Metrics" 
          value={analyticsData.timeMetrics.avgCompletionTime}
          description={`${analyticsData.timeMetrics.onTimeRate}% on-time completion`}
          icon={<FiClock size={20} />}
          change={analyticsData.timeMetrics.change}
          color="#38A169"
        />
      </div>
      
      {/* Main Report Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '2rem' }}>
        {/* Task Distribution Chart */}
        <ChartPlaceholder 
          title="Task Status Distribution" 
          icon={<FiPieChart size={20} />}
          description="Distribution of tasks by current status"
          data={[
            { label: 'Completed', value: analyticsData.taskCompletion.completed, color: '#38A169' },
            { label: 'In Progress', value: analyticsData.taskCompletion.inProgress, color: '#3182CE' },
            { label: 'To Do', value: analyticsData.taskCompletion.todo, color: '#E53E3E' }
          ]}
          height="300px"
        />
        
        {/* Priority Distribution Chart */}
        <ChartPlaceholder 
          title="Task Priority Distribution" 
          icon={<FiBarChart2 size={20} />}
          description="Distribution of tasks by priority level"
          data={[
            { label: 'High', value: analyticsData.distribution.priority.high || 0, color: '#E53E3E' },
            { label: 'Medium', value: analyticsData.distribution.priority.medium || 0, color: '#DD6B20' },
            { label: 'Low', value: analyticsData.distribution.priority.low || 0, color: '#38A169' }
          ]}
          height="300px"
        />
        
        {/* User Performance Chart */}
        <ChartPlaceholder 
          title="User Performance" 
          icon={<FiUsers size={20} />}
          description="Tasks completed per user"
          data={userPerformanceData}
          height="300px"
          showPlaceholder={userPerformanceData.length === 0}
          emptyStateMessage="No completed tasks by users yet"
        />
        
        {/* Completion Trend Chart */}
        <TrendChart 
          title="Task Completion Trend" 
          icon={<FiTrendingUp size={20} />}
          description="Weekly task completion rate over time"
          trendData={trendData}
          height="300px"
          showPlaceholder={completionTrend.length === 0}
          emptyStateMessage="Not enough data to display trends yet"
        />
      </div>
    </Container>
  );
}

// Helper function to get colors for chart items
function getColorForIndex(index: number): string {
  const colors = [
    '#3182CE', // blue
    '#38A169', // green
    '#DD6B20', // orange
    '#805AD5', // purple
    '#D53F8C', // pink
    '#00B5D8', // cyan
    '#ED8936', // orange
    '#4299E1', // light blue
    '#48BB78', // light green
    '#9F7AEA'  // light purple
  ];
  
  return colors[index % colors.length];
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  description: string;
  secondaryInfo?: string;
  icon: React.ReactNode;
  change?: number;
  color: string;
}

function StatCard({ title, value, description, secondaryInfo, icon, change, color }: StatCardProps) {
  return (
    <Box
      p={5}
      borderRadius="lg"
      borderWidth="1px"
      borderLeft="4px solid"
      borderLeftColor={color}
      boxShadow="md"
      bg="gray.800"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <Text fontWeight="medium" fontSize="lg" color="gray.200">{title}</Text>
        <Box color={color}>{icon}</Box>
      </div>
      
      <Text fontSize="2xl" fontWeight="bold" color="white" mb={1}>{value}</Text>
      <Text fontSize="sm" color="gray.400">
        {description}
        {change !== undefined && (
          <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.5rem' }}>
            <span style={{ 
              color: change > 0 ? '#38A169' : '#E53E3E',
              marginRight: '0.25rem'
            }}>
              {change > 0 ? '↑' : '↓'}
            </span>
            {Math.abs(change)}% from last month
          </span>
        )}
      </Text>
      
      {secondaryInfo && (
        <Text fontSize="sm" color="gray.500" mt={2}>{secondaryInfo}</Text>
      )}
    </Box>
  );
}

// Chart Placeholder Component
interface ChartPlaceholderProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  data?: Array<{label: string, value: number, color: string}>;
  showPlaceholder?: boolean;
  height: string;
  emptyStateMessage?: string;
}

function ChartPlaceholder({ 
  title, 
  icon, 
  description, 
  data, 
  showPlaceholder = false, 
  height,
  emptyStateMessage = "Chart visualization would appear here."
}: ChartPlaceholderProps) {
  return (
    <Box
      p={5}
      borderRadius="lg"
      borderWidth="1px"
      boxShadow="md"
      height={height}
      bg="gray.800"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <Heading size="md" color="gray.200">{title}</Heading>
        <Box color="#3182CE">{icon}</Box>
      </div>
      <Text fontSize="sm" color="gray.400" mb={4}>{description}</Text>
      
      {data && !showPlaceholder ? (
        <div style={{ height: 'calc(100% - 80px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
            {data.map((item, index) => (
              <div key={index} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text fontSize="sm" color="gray.300">{item.label}</Text>
                  <Text fontSize="sm" fontWeight="bold" color="white">{item.value}</Text>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#2D3748', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min(100, (item.value / Math.max(...data.map(d => d.value)) * 100))}%`,
                      backgroundColor: item.color,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ 
          height: 'calc(100% - 80px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          borderRadius: '0.375rem',
          backgroundColor: '#2D3748',
          color: '#718096',
          padding: '1rem'
        }}>
          <Text textAlign="center" fontStyle="italic">
            {emptyStateMessage}
          </Text>
          <Text fontSize="sm" mt={2} textAlign="center">
            {!data ? "Connect to your data visualization library of choice." : "Complete some tasks to see data here."}
          </Text>
        </div>
      )}
    </Box>
  );
}

// Trend Chart Component
interface TrendChartProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  trendData: {labels: string[], values: number[]};
  height: string;
  showPlaceholder?: boolean;
  emptyStateMessage?: string;
}

function TrendChart({ 
  title, 
  icon, 
  description, 
  trendData, 
  height,
  showPlaceholder = false,
  emptyStateMessage = "Not enough data to display trends yet" 
}: TrendChartProps) {
  return (
    <Box
      p={5}
      borderRadius="lg"
      borderWidth="1px"
      boxShadow="md"
      height={height}
      bg="gray.800"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <Heading size="md" color="gray.200">{title}</Heading>
        <Box color="#3182CE">{icon}</Box>
      </div>
      <Text fontSize="sm" color="gray.400" mb={4}>{description}</Text>
      
      {trendData.labels.length > 0 && !showPlaceholder ? (
        <div style={{ height: 'calc(100% - 80px)', position: 'relative' }}>
          {/* Line chart */}
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            position: 'relative',
            padding: '10px 0'
          }}>
            {/* Y-axis labels */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Text fontSize="xs" color="gray.400">100%</Text>
              <Text fontSize="xs" color="gray.400">75%</Text>
              <Text fontSize="xs" color="gray.400">50%</Text>
              <Text fontSize="xs" color="gray.400">25%</Text>
              <Text fontSize="xs" color="gray.400">0%</Text>
            </div>
            
            {/* Chart elements */}
            <div style={{ marginLeft: '30px', width: 'calc(100% - 30px)', height: '100%', display: 'flex' }}>
              {trendData.values.map((value, index) => {
                // Skip if we're at the first point (need 2 points to draw a line)
                if (index === 0) return null;
                
                // Connect to previous point
                const prevValue = trendData.values[index - 1];
                const x1 = ((index - 1) / (trendData.values.length - 1)) * 100;
                const y1 = 100 - prevValue; // Invert for CSS positioning
                const x2 = (index / (trendData.values.length - 1)) * 100;
                const y2 = 100 - value; // Invert for CSS positioning
                
                return (
                  <React.Fragment key={index}>
                    {/* Line from previous point to this point */}
                    <div style={{
                      position: 'absolute',
                      left: `${x1}%`,
                      bottom: `${y1}%`,
                      width: `${x2 - x1}%`,
                      height: '1px', // Line thickness
                      background: '#3182CE',
                      transform: `rotate(${Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)}deg)`,
                      transformOrigin: '0 50%',
                      zIndex: 1
                    }} />
                    
                    {/* Point marker */}
                    <div style={{
                      position: 'absolute',
                      left: `${x2}%`,
                      bottom: `${y2}%`,
                      width: '6px',
                      height: '6px',
                      background: '#3182CE',
                      borderRadius: '50%',
                      transform: 'translate(-50%, 50%)',
                      zIndex: 2
                    }} />
                  </React.Fragment>
                );
              })}
              
              {/* First point marker */}
              {trendData.values.length > 0 && (
                <div style={{
                  position: 'absolute',
                  left: '0%',
                  bottom: `${100 - trendData.values[0]}%`,
                  width: '6px',
                  height: '6px',
                  background: '#3182CE',
                  borderRadius: '50%',
                  transform: 'translate(-50%, 50%)',
                  zIndex: 2
                }} />
              )}
              
              {/* Grid lines - horizontal */}
              {[0, 25, 50, 75, 100].map(percent => (
                <div key={`grid-${percent}`} style={{
                  position: 'absolute',
                  left: '30px',
                  right: '0',
                  bottom: `${percent}%`,
                  height: '1px',
                  background: '#2D3748',
                  zIndex: 0
                }} />
              ))}
            </div>
          </div>
          
          {/* X-axis labels */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginLeft: '30px',
            marginTop: '5px' 
          }}>
            {trendData.labels.map((label, index) => (
              <Text key={index} fontSize="xs" color="gray.400" style={{
                width: `${100 / trendData.labels.length}%`,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {label}
              </Text>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ 
          height: 'calc(100% - 80px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          borderRadius: '0.375rem',
          backgroundColor: '#2D3748',
          color: '#718096',
          padding: '1rem'
        }}>
          <Text textAlign="center" fontStyle="italic">
            {emptyStateMessage}
          </Text>
          <Text fontSize="sm" mt={2} textAlign="center">
            Complete tasks over time to see trend data.
          </Text>
        </div>
      )}
    </Box>
  );
} 