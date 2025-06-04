import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import LoginPage from './components/LoginPage';
import Dashboard from './components/dashboard/Dashboard';
import { TenantProvider } from './contexts/TenantContext';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session and set user
    const getSession = async () => {
      // Check for test user first
      const testUser = localStorage.getItem('testUser');
      if (testUser) {
        setUser(JSON.parse(testUser));
        setLoading(false);
        return;
      }
      
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
      
      // Listen for auth changes
      const { subscription } = supabase.auth.onAuthStateChange(
        (_, session) => {
          setUser(session?.user || null);
        }
      );
      
      return () => {
        subscription?.unsubscribe();
      };
    };
    
    getSession();
  }, []);

  // Protected route component
  const ProtectedRoute = ({ element }) => {
    if (loading) return <div>Loading...</div>;
    return user ? element : <Navigate to="/login" />;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route 
          path="/dashboard" 
          element={
            user ? (
              <TenantProvider userId={user.id}>
                <Dashboard />
              </TenantProvider>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;