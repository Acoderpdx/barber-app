import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userType, setUserType] = useState('client'); // 'client' or 'barber'
  
  // Add this for tenant data
  const [tenantData, setTenantData] = useState({
    name: '',
    subdomain: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // For test users
      if (email === 'test@example.com' && password === 'test') {
        const testUser = {
          id: 'test-' + Date.now(),
          email: email,
          user_type: userType,
          app_metadata: { user_type: userType }
        };
        localStorage.setItem('testUser', JSON.stringify(testUser));
        window.location.href = '/dashboard';
        return;
      }

      if (isLogin) {
        // Handle login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Check if this is an email confirmation error
          if (error.message.includes('Email not confirmed')) {
            setError('Please check your inbox and confirm your email before logging in.');
          } else {
            throw error;
          }
        }
      } else {
        // Handle signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              user_type: userType
            }
          }
        });

        if (error) throw error;
        
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: data.user.id,
              email: email,  // Now this should work since the column exists
              user_type: userType,
            }
          ]);
        
        if (profileError) throw profileError;
        
        // If barber, create tenant and link to profile
        if (userType === 'barber' && tenantData.name) {
          // Create new tenant
          const { data: newTenant, error: tenantError } = await supabase
            .from('tenants')
            .insert([{
              name: tenantData.name,
              subdomain: tenantData.name.toLowerCase().replace(/\s+/g, '-')
            }])
            .select();
            
          if (tenantError) throw tenantError;
          
          // Update profile with tenant_id
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ tenant_id: newTenant[0].id })
            .eq('id', data.user.id);
            
          if (updateError) throw updateError;
        }
        
        alert("Account created! Please sign in.");
        setIsLogin(true);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h2 style={styles.title}>
          {isLogin ? 'Log In' : 'Create New Account'}
        </h2>
        
        {error && (
          <div id="error-container" style={styles.errorContainer}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>I am a:</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="userType"
                  value="client"
                  checked={userType === 'client'}
                  onChange={() => setUserType('client')}
                  style={styles.radioInput}
                />
                Client
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="userType"
                  value="barber"
                  checked={userType === 'barber'}
                  onChange={() => setUserType('barber')}
                  style={styles.radioInput}
                />
                Barber
              </label>
            </div>
          </div>
          
          {/* Show barber shop fields for new barber accounts */}
          {!isLogin && userType === 'barber' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Barber Shop Name</label>
              <input
                type="text"
                value={tenantData.name}
                onChange={(e) => setTenantData({...tenantData, name: e.target.value})}
                required
                style={styles.input}
                placeholder="Enter your shop name"
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        
        {error && error.includes('not confirmed') && (
          <button 
            onClick={async () => {
              const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
              });
              if (!error) {
                alert('Confirmation email resent!');
              }
            }}
            style={styles.secondaryButton}
          >
            Resend Confirmation Email
          </button>
        )}
        
        <div style={styles.switchMode}>
          {isLogin ? (
            <p>
              Need an account? <a onClick={() => setIsLogin(false)} style={styles.link}>Sign up</a>
            </p>
          ) : (
            <p>
              Already have an account? <a onClick={() => setIsLogin(true)} style={styles.link}>Log in</a>
            </p>
          )}
        </div>
        
        {/* For testing purposes */}
        <div style={styles.testCredentials}>
          <p style={styles.testCredentialsText}>Test credentials:</p>
          <p style={styles.testCredentialsText}>Email: test@example.com</p>
          <p style={styles.testCredentialsText}>Password: test</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f7f9fc'
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '32px',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    marginBottom: '24px',
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4b5563'
  },
  input: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },
  radioGroup: {
    display: 'flex',
    gap: '16px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  radioInput: {
    cursor: 'pointer'
  },
  button: {
    backgroundColor: '#4a75b5',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '8px'
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#4a75b5',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '8px'
  },
  switchMode: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '14px'
  },
  link: {
    color: '#4a75b5',
    textDecoration: 'underline',
    cursor: 'pointer'
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  testCredentials: {
    marginTop: '24px',
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px'
  },
  testCredentialsText: {
    margin: '4px 0',
    fontSize: '12px',
    color: '#6b7280'
  }
};

export default LoginPage;