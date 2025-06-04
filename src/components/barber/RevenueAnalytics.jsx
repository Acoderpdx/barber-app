import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

const RevenueAnalytics = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'year', 'all'
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    appointmentsCompleted: 0,
    averageService: 0,
    topService: '',
    dailyRevenue: [],
    serviceBreakdown: [],
    monthlyTrend: []
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, user]);

  const fetchAnalyticsData = async () => {
    setLoading(true);

    try {
      // For test barber, use mock data
      if (user.id.startsWith('test-')) {
        // Generate mock data based on time range
        const mockData = generateMockData(timeRange);
        setRevenueData(mockData);
        setLoading(false);
        return;
      }

      // For real barber, fetch from Supabase
      // Get date range based on selected time range
      const { startDate, endDate } = getDateRange(timeRange);

      // Fetch appointments within date range
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          services:service_id (
            name,
            price
          )
        `)
        .eq('barber_id', user.id)
        .eq('status', 'completed')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Process the data
      const analyticsData = processAppointmentData(appointments);
      setRevenueData(analyticsData);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get date range based on selected time period
  const getDateRange = (range) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(2010, 0, 1); // Far back enough to include all
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1); // Default to month
    }

    return { startDate, endDate };
  };

  // Process real appointment data
  const processAppointmentData = (appointments) => {
    // Initialize result structure
    const result = {
      totalRevenue: 0,
      appointmentsCompleted: appointments.length,
      averageService: 0,
      topService: '',
      dailyRevenue: [],
      serviceBreakdown: [],
      monthlyTrend: []
    };

    // Service counts
    const serviceCounts = {};
    let totalPrice = 0;

    // Daily revenue map
    const dailyRevenueMap = {};
    
    // Monthly revenue map
    const monthlyRevenueMap = {};

    // Process each appointment
    appointments.forEach(appointment => {
      const price = appointment.services?.price || 0;
      const serviceName = appointment.services?.name || 'Unknown';
      
      // Add to total revenue
      totalPrice += price;
      
      // Count services
      if (!serviceCounts[serviceName]) {
        serviceCounts[serviceName] = { count: 0, revenue: 0 };
      }
      serviceCounts[serviceName].count += 1;
      serviceCounts[serviceName].revenue += price;

      // Daily revenue
      const date = new Date(appointment.start_time).toISOString().split('T')[0];
      if (!dailyRevenueMap[date]) {
        dailyRevenueMap[date] = 0;
      }
      dailyRevenueMap[date] += price;

      // Monthly revenue
      const monthYear = new Date(appointment.start_time).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyRevenueMap[monthYear]) {
        monthlyRevenueMap[monthYear] = 0;
      }
      monthlyRevenueMap[monthYear] += price;
    });

    // Calculate average service price
    result.averageService = appointments.length > 0 
      ? Math.round((totalPrice / appointments.length) * 100) / 100 
      : 0;
    
    result.totalRevenue = totalPrice;

    // Find top service
    let topServiceName = '';
    let topServiceRevenue = 0;
    
    Object.entries(serviceCounts).forEach(([name, data]) => {
      if (data.revenue > topServiceRevenue) {
        topServiceName = name;
        topServiceRevenue = data.revenue;
      }
    });
    
    result.topService = topServiceName;

    // Format service breakdown
    result.serviceBreakdown = Object.entries(serviceCounts).map(([name, data]) => ({
      name,
      count: data.count,
      revenue: data.revenue
    })).sort((a, b) => b.revenue - a.revenue);

    // Format daily revenue for chart
    result.dailyRevenue = Object.entries(dailyRevenueMap).map(([date, amount]) => ({
      date,
      amount
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Format monthly trend for chart
    result.monthlyTrend = Object.entries(monthlyRevenueMap).map(([month, amount]) => ({
      month,
      amount
    })).sort((a, b) => a.month.localeCompare(b.month));

    return result;
  };

  // Generate mock data for testing
  const generateMockData = (timeRange) => {
    const mockServices = [
      'Haircut', 'Beard Trim', 'Full Service', 'Hair Coloring', 'Fade', 
      'Kids Cut', 'Hot Towel Shave', 'Highlight'
    ];

    // Base revenue data
    const revenue = {
      week: 720,
      month: 3200,
      year: 38400,
      all: 65800
    };

    // Base appointment counts
    const appointments = {
      week: 24,
      month: 95,
      year: 1100,
      all: 2200
    };

    // Generate daily revenue data
    const dailyRevenue = [];
    const { startDate, endDate } = getDateRange(timeRange);
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Add some randomness to daily revenue
      const dayAmount = 100 + Math.floor(Math.random() * 150);
      
      // Weekend boost
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const amount = isWeekend ? dayAmount * 1.5 : dayAmount;
      
      dailyRevenue.push({
        date: currentDate.toISOString().split('T')[0],
        amount: Math.round(amount)
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate service breakdown
    const serviceBreakdown = mockServices.map(name => {
      const basePrice = name === 'Full Service' ? 40 :
                        name === 'Hair Coloring' ? 60 :
                        name === 'Highlight' ? 75 : 25;
      
      const count = Math.floor(5 + Math.random() * 20);
      return {
        name,
        count,
        revenue: count * basePrice
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Generate monthly trend (last 12 months)
    const monthlyTrend = [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month < 0) {
        month += 12;
        year -= 1;
      }
      
      // Format as YYYY-MM
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      // Base amount with some randomness
      let amount = 2500 + Math.floor(Math.random() * 1000);
      
      // December and summer months have higher revenue
      if (month === 11 || month === 5 || month === 6) {
        amount *= 1.3;
      }
      
      monthlyTrend.push({
        month: monthStr,
        amount: Math.round(amount)
      });
    }

    // Sort monthly trend by date
    monthlyTrend.sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalRevenue: revenue[timeRange],
      appointmentsCompleted: appointments[timeRange],
      averageService: Math.round(revenue[timeRange] / appointments[timeRange]),
      topService: 'Haircut', // Most common service
      dailyRevenue,
      serviceBreakdown: serviceBreakdown.slice(0, 5), // Top 5 services
      monthlyTrend
    };
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return '$' + amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Format large numbers with k/m suffix
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'm';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num;
  };

  // Simple horizontal bar chart component
  const BarChart = ({ data, valueKey, labelKey, color }) => {
    const maxValue = Math.max(...data.map(item => item[valueKey]));
    
    return (
      <div style={styles.barChartContainer}>
        {data.map((item, index) => (
          <div key={index} style={styles.barChartItem}>
            <div style={styles.barChartLabel}>{item[labelKey]}</div>
            <div style={styles.barChartBarContainer}>
              <div 
                style={{
                  ...styles.barChartBar,
                  width: `${(item[valueKey] / maxValue) * 100}%`,
                  backgroundColor: color || '#4a75b5'
                }}
              />
              <span style={styles.barChartValue}>
                {valueKey === 'revenue' ? formatCurrency(item[valueKey]) : item[valueKey]}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Simple line chart component for daily/monthly revenue
  const LineChart = ({ data, valueKey, labelKey }) => {
    const maxValue = Math.max(...data.map(item => item[valueKey]));
    const minValue = Math.min(...data.map(item => item[valueKey]));
    const range = maxValue - minValue;
    
    return (
      <div style={styles.lineChartContainer}>
        <div style={styles.lineChartHeader}>
          <div>Date</div>
          <div>Revenue</div>
        </div>
        <div style={styles.lineChart}>
          {data.map((item, index) => {
            const heightPercentage = range === 0 
              ? 50 
              : ((item[valueKey] - minValue) / range) * 80 + 10;
            
            return (
              <div 
                key={index} 
                style={styles.lineChartBar}
                title={`${item[labelKey]}: ${formatCurrency(item[valueKey])}`}
              >
                <div 
                  style={{
                    ...styles.lineChartPoint,
                    height: `${heightPercentage}%`
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={styles.lineChartLabels}>
          {data.length > 10 
            ? [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((item, i) => (
                <div key={i} style={{ flex: i === 0 ? '0 0 auto' : i === 2 ? '0 0 auto' : '1 1 auto', textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center' }}>
                  {item[labelKey].includes('-') ? new Date(item[labelKey]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : item[labelKey]}
                </div>
              ))
            : data.map((item, i) => (
                <div key={i} style={{ flex: '1 1 auto', textAlign: 'center' }}>
                  {item[labelKey].includes('-') ? new Date(item[labelKey]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : item[labelKey]}
                </div>
              ))
          }
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Revenue & Analytics</h2>
      
      <div style={styles.timeFilter}>
        <button 
          style={{...styles.timeButton, ...(timeRange === 'week' ? styles.timeButtonActive : {})}}
          onClick={() => setTimeRange('week')}
        >
          Week
        </button>
        <button 
          style={{...styles.timeButton, ...(timeRange === 'month' ? styles.timeButtonActive : {})}}
          onClick={() => setTimeRange('month')}
        >
          Month
        </button>
        <button 
          style={{...styles.timeButton, ...(timeRange === 'year' ? styles.timeButtonActive : {})}}
          onClick={() => setTimeRange('year')}
        >
          Year
        </button>
        <button 
          style={{...styles.timeButton, ...(timeRange === 'all' ? styles.timeButtonActive : {})}}
          onClick={() => setTimeRange('all')}
        >
          All Time
        </button>
      </div>

      {loading ? (
        <p>Loading analytics data...</p>
      ) : (
        <div>
          {/* Summary Cards */}
          <div style={styles.summaryCards}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Total Revenue</h3>
              <p style={styles.summaryValue}>{formatCurrency(revenueData.totalRevenue)}</p>
            </div>
            
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Completed Appointments</h3>
              <p style={styles.summaryValue}>{formatNumber(revenueData.appointmentsCompleted)}</p>
            </div>
            
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Average Service Value</h3>
              <p style={styles.summaryValue}>{formatCurrency(revenueData.averageService)}</p>
            </div>
            
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Top Service</h3>
              <p style={styles.summaryValue}>{revenueData.topService}</p>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>
              {timeRange === 'week' || timeRange === 'month' 
                ? 'Daily Revenue Trend' 
                : 'Monthly Revenue Trend'}
            </h3>
            {(timeRange === 'week' || timeRange === 'month') && revenueData.dailyRevenue.length > 0 ? (
              <LineChart 
                data={revenueData.dailyRevenue} 
                valueKey="amount" 
                labelKey="date" 
              />
            ) : revenueData.monthlyTrend.length > 0 ? (
              <LineChart 
                data={revenueData.monthlyTrend} 
                valueKey="amount" 
                labelKey="month" 
              />
            ) : (
              <p>No trend data available</p>
            )}
          </div>

          {/* Services Breakdown */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>
              Top Services by Revenue
            </h3>
            {revenueData.serviceBreakdown.length > 0 ? (
              <BarChart 
                data={revenueData.serviceBreakdown} 
                valueKey="revenue" 
                labelKey="name" 
                color="#4a75b5" 
              />
            ) : (
              <p>No service data available</p>
            )}
          </div>

          {/* Services Breakdown by Count */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>
              Top Services by Appointment Count
            </h3>
            {revenueData.serviceBreakdown.length > 0 ? (
              <BarChart 
                data={revenueData.serviceBreakdown} 
                valueKey="count" 
                labelKey="name" 
                color="#5a6b9a" 
              />
            ) : (
              <p>No service data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#333'
  },
  timeFilter: {
    display: 'flex',
    marginBottom: '24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '4px',
    width: 'fit-content'
  },
  timeButton: {
    background: 'none',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666'
  },
  timeButtonActive: {
    backgroundColor: '#4a75b5',
    color: 'white'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  summaryTitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
    fontWeight: '500'
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333'
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  chartTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '20px',
    fontWeight: '500'
  },
  barChartContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  barChartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  barChartLabel: {
    width: '120px',
    fontSize: '14px',
    color: '#333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  barChartBarContainer: {
    flex: '1',
    height: '30px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    position: 'relative'
  },
  barChartBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s'
  },
  barChartValue: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '12px',
    fontWeight: '500',
    color: '#333'
  },
  lineChartContainer: {
    width: '100%',
    height: '300px'
  },
  lineChartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#666'
  },
  lineChart: {
    display: 'flex',
    height: '200px',
    gap: '2px',
    alignItems: 'flex-end',
    marginBottom: '12px',
    position: 'relative',
    backgroundColor: '#f7f9fc',
    borderRadius: '4px',
    padding: '10px 0'
  },
  lineChartBar: {
    flex: '1 1 0',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end'
  },
  lineChartPoint: {
    width: '100%',
    backgroundColor: '#4a75b5',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px'
  },
  lineChartLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666'
  }
};

export default RevenueAnalytics;