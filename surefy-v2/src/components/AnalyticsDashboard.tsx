"use client";
import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Analytics, TrendingUp, Group, Category } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { TableColumn, TableRow as TableRowType, ActivityLog } from '../tableSlice';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsDashboardProps {
  open: boolean;
  onClose: () => void;
}

export default function AnalyticsDashboard({ open, onClose }: AnalyticsDashboardProps) {
  const tableState = useSelector((state: RootState) => state.table) || {};
  const activityLog = Array.isArray(tableState.activityLog) ? tableState.activityLog : [];

  // Calculate analytics data
  const analytics = React.useMemo(() => {
    const safeRows = Array.isArray(tableState.rows) ? tableState.rows : [];
    const safeColumns = Array.isArray(tableState.columns) ? tableState.columns : [];
    const safeActivityLog = Array.isArray(tableState.activityLog) ? tableState.activityLog : [];

    const totalRows = safeRows.length;
    const totalColumns = safeColumns.length;
    const visibleColumns = safeColumns.filter((col: TableColumn) => col.visible).length;

    // Role distribution
    const roleDistribution = safeRows.reduce((acc, row: TableRowType) => {
      const role = String(row.role || 'Unknown'); // ensure string key
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Age distribution
    const ageDistribution = safeRows.reduce((acc, row: TableRowType) => {
      const age = parseInt(String(row.age));
      if (!isNaN(age)) {
        const ageGroup = age < 25 ? '18-24' : age < 35 ? '25-34' : age < 45 ? '35-44' : age < 55 ? '45-54' : '55+';
        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Activity over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = safeActivityLog.filter((log: ActivityLog) => 
      new Date(log.timestamp) >= thirtyDaysAgo
    );

    const activityByDay = recentActivity.reduce((acc, log: ActivityLog) => {
      const day = format(new Date(log.timestamp), 'MMM dd');
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const activityByType = recentActivity.reduce((acc, log: ActivityLog) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRows,
      totalColumns,
      visibleColumns,
      roleDistribution,
      ageDistribution,
      activityByDay,
      actionCounts: activityByType,
      recentActivity: recentActivity.slice(0, 10),
    };
  }, [tableState.rows, tableState.columns, tableState.activityLog]);

  const roleChartData = {
    labels: Object.keys(analytics.roleDistribution),
    datasets: [
      {
        data: Object.values(analytics.roleDistribution),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
        borderWidth: 1,
      },
    ],
  };

  const ageChartData = {
    labels: Object.keys(analytics.ageDistribution),
    datasets: [
      {
        label: 'Number of People',
        data: Object.values(analytics.ageDistribution),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const activityChartData = {
    labels: Object.keys(analytics.activityByDay),
    datasets: [
      {
        label: 'Activities',
        data: Object.values(analytics.activityByDay),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Analytics />
          Data Analytics Dashboard
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ minHeight: 600 }}>
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item={true} xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Group sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">{analytics.totalRows}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Records
                </Typography>
              </Paper>
            </Grid>
            <Grid item={true} xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Category sx={{ fontSize: 40, color: 'success.main' }} />
                <Typography variant="h4">{analytics.visibleColumns}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Visible Columns
                </Typography>
              </Paper>
            </Grid>
            <Grid item={true} xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'warning.main' }} />
                <Typography variant="h4">{Object.keys(analytics.roleDistribution).length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique Roles
                </Typography>
              </Paper>
            </Grid>
            <Grid item={true} xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Analytics sx={{ fontSize: 40, color: 'error.main' }} />
                <Typography variant="h4">{analytics.recentActivity.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Recent Activities
                </Typography>
              </Paper>
            </Grid>

            {/* Charts */}
            <Grid item={true} xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Role Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Doughnut data={roleChartData} options={chartOptions} />
                </Box>
              </Paper>
            </Grid>
            <Grid item={true} xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Age Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar data={ageChartData} options={chartOptions} />
                </Box>
              </Paper>
            </Grid>
            <Grid item={true} xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Activity Timeline (Last 30 Days)
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line data={activityChartData} options={chartOptions} />
                </Box>
              </Paper>
            </Grid>

            {/* Recent Activity Table */}
            <Grid item={true} xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Details</TableCell>
                        <TableCell>User</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activityLog
                        .slice()
                        .reverse()
                        .slice(0, 10)
                        .map((log: ActivityLog) => (
                          <TableRow key={log.id}>
                            <TableCell>{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm')}</TableCell>
                            <TableCell>
                              <Chip
                                label={log.action}
                                color={
                                  log.action === 'create' ? 'success' :
                                  log.action === 'update' ? 'warning' :
                                  log.action === 'delete' ? 'error' :
                                  'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{log.details}</TableCell>
                            <TableCell>{log.user}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
