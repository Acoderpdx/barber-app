import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import ClientDashboard from './ClientDashboard';
import BarberDashboard from './BarberDashboard';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserData = async () => {
      try {
        // Check for test user first
        const testUser = localStorage.getItem('testUser');
        if (testUser) {
          const parsedUser = JSON.parse(testUser);
          setUser(parsedUser);
          setUserType(parsedUser.user_metadata.user_type);
          setLoading(false);
          return;
        }
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }

        setUser(session.user);
        
        // Get the user profile from the database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        
        setUserType(profile?.user_type || session.user.user_metadata?.user_type);
        setLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
        setLoading(false);
      }
    };

    getUserData();
  }, [navigate]);

  const handleSignOut = async () => {
    // Clear test user if exists
    localStorage.removeItem('testUser');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Navigate to login page
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Barber App</h1>
        <div style={styles.userInfo}>
          <span>{user?.email}</span>
          <button onClick={handleSignOut} style={styles.signOutButton}>Sign Out</button>
        </div>
      </header>

      <div style={styles.content}>
        {userType === 'client' ? (
          <ClientDashboard user={user} />
        ) : userType === 'barber' ? (
          <BarberDashboard user={user} />
        ) : (
          <div style={styles.errorContainer}>
            <p>User type not recognized. Please contact support.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f7f9fc'
  },
  header: {
    backgroundColor: '#4a75b5',
    color: 'white',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  signOutButton: {
    background: 'transparent',
    border: '1px solid white',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  content: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  errorContainer: {
    textAlign: 'center',
    marginTop: '48px',
    padding: '24px',
    backgroundColor: '#fff5f5',
    borderRadius: '8px',
    color: '#e53e3e'
  }
};

export default Dashboard;