import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const TenantContext = createContext(null);

export const TenantProvider = ({ children, userId }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Get user's tenant ID
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', userId)
          .single();
          
        if (userError || !userData.tenant_id) {
          setLoading(false);
          return;
        }
        
        // Get tenant details
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', userData.tenant_id)
          .single();
          
        if (!tenantError) {
          setTenant(tenantData);
        }
      } catch (error) {
        console.error('Error fetching tenant:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenantData();
  }, [userId]);

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);