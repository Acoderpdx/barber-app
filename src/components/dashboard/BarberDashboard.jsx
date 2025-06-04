import { useState } from 'react';
import ClientManagement from '../barber/ClientManagement';
import RevenueAnalytics from '../barber/RevenueAnalytics';
import BarberCalendar from '../barber/BarberCalendar';
import TenantSettings from '../barber/TenantSettings';

const BarberDashboard = ({ user }) => {
  const [activeView, setActiveView] = useState('dashboard');

  // Show the selected view
  if (activeView === 'clients') {
    return (
      <div>
        <button 
          onClick={() => setActiveView('dashboard')} 
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
        <ClientManagement user={user} />
      </div>
    );
  }
  
  // Show Revenue & Analytics view
  if (activeView === 'revenue') {
    return (
      <div>
        <button 
          onClick={() => setActiveView('dashboard')} 
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
        <RevenueAnalytics user={user} />
      </div>
    );
  }

  // Show Calendar view
  if (activeView === 'calendar') {
    return (
      <div>
        <button 
          onClick={() => setActiveView('dashboard')} 
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
        <BarberCalendar user={user} />
      </div>
    );
  }

  // Show Settings view
  if (activeView === 'settings') {
    return (
      <div>
        <button 
          onClick={() => setActiveView('dashboard')} 
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
        <TenantSettings user={user} />
      </div>
    );
  }

  // Default dashboard view
  return (
    <div>
      <h2>Barber Dashboard</h2>
      <div style={styles.dashboardGrid}>
        <div style={styles.card}>
          <h3>Calendar</h3>
          <p>Manage your appointments and schedule</p>
          <button 
            style={styles.button}
            onClick={() => setActiveView('calendar')}
          >
            Open Calendar
          </button>
        </div>
        
        <div style={styles.card}>
          <h3>Client Management</h3>
          <p>View client profiles and history</p>
          <button 
            style={styles.button}
            onClick={() => setActiveView('clients')}
          >
            Manage Clients
          </button>
        </div>
        
        <div style={styles.card}>
          <h3>Revenue & Analytics</h3>
          <p>Track your earnings and performance</p>
          <button 
            style={styles.button}
            onClick={() => setActiveView('revenue')}
          >
            View Reports
          </button>
        </div>
        
        <div style={styles.card}>
          <h3>Shop Settings</h3>
          <p>Manage availability and services</p>
          <button 
            style={styles.button}
            onClick={() => setActiveView('settings')}
          >
            Edit Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '24px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  button: {
    backgroundColor: '#4a75b5',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    marginTop: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#4a75b5',
    cursor: 'pointer',
    padding: '8px 0',
    fontSize: '16px',
    textAlign: 'left',
    marginBottom: '16px'
  }
};

export default BarberDashboard;