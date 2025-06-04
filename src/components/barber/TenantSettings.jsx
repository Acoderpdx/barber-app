import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useTenant } from '../../contexts/TenantContext';

const TenantSettings = ({ user }) => {
  const { tenant, loading: tenantLoading } = useTenant();
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    logo_url: '',
    primary_color: '#4a75b5'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        subdomain: tenant.subdomain || '',
        logo_url: tenant.logo_url || '',
        primary_color: tenant.primary_color || '#4a75b5'
      });
    }
  }, [tenant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenant) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update(formData)
        .eq('id', tenant.id);
        
      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (tenantLoading) return <div>Loading shop settings...</div>;
  
  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Shop Settings</h2>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Business Name</label>
          <input 
            name="name" 
            value={formData.name}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Custom URL (yourname.barberapp.com)</label>
          <div style={styles.inputGroup}>
            <input 
              name="subdomain" 
              value={formData.subdomain}
              onChange={handleChange}
              style={styles.input}
            />
            <span style={styles.inputAddon}>.barberapp.com</span>
          </div>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Logo URL</label>
          <input 
            name="logo_url" 
            value={formData.logo_url}
            onChange={handleChange}
            style={styles.input}
            placeholder="https://example.com/your-logo.png"
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Primary Color</label>
          <div style={styles.colorPickerContainer}>
            <input 
              type="color"
              name="primary_color" 
              value={formData.primary_color}
              onChange={handleChange}
              style={styles.colorPicker}
            />
            <span style={styles.colorCode}>{formData.primary_color}</span>
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={saving} 
          style={styles.saveButton}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#333'
  },
  form: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#4b5563'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center'
  },
  inputAddon: {
    padding: '10px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderLeft: 'none',
    borderRadius: '0 4px 4px 0',
    color: '#6b7280'
  },
  colorPickerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  colorPicker: {
    width: '60px',
    height: '40px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  colorCode: {
    fontSize: '14px',
    color: '#4b5563'
  },
  saveButton: {
    backgroundColor: '#4a75b5',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '12px'
  }
};

export default TenantSettings;