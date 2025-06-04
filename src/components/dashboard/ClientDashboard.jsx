const ClientDashboard = ({ user }) => {
  return (
    <div>
      <h2>Client Dashboard</h2>
      <div style={styles.dashboardGrid}>
        <div style={styles.card}>
          <h3>Book Appointment</h3>
          <p>Schedule your next haircut or service</p>
          <button style={styles.button}>Book Now</button>
        </div>
        
        <div style={styles.card}>
          <h3>My Appointments</h3>
          <p>View your upcoming appointments</p>
          <button style={styles.button}>View Schedule</button>
        </div>
        
        <div style={styles.card}>
          <h3>Subscription Plan</h3>
          <p>Manage your subscription and perks</p>
          <button style={styles.button}>Manage Plan</button>
        </div>
        
        <div style={styles.card}>
          <h3>Profile & Preferences</h3>
          <p>Update your profile information</p>
          <button style={styles.button}>Edit Profile</button>
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
    transition: 'transform 0.2s, box-shadow 0.2s',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }
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
  }
};

export default ClientDashboard;