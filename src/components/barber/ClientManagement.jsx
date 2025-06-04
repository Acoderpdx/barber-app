import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

const ClientManagement = ({ user }) => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list'); // 'list' or 'detail'
  const [clientNotes, setClientNotes] = useState('');
  const [clientAppointments, setClientAppointments] = useState([]);

  useEffect(() => {
    fetchClients();
  }, [user]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      // For test barber, use mock data
      if (user.id.startsWith('test-')) {
        const mockClients = [
          { 
            id: 'client-1', 
            first_name: 'John', 
            last_name: 'Smith', 
            email: 'john@example.com',
            phone: '555-123-4567',
            last_visit: '2023-05-15',
            total_visits: 8,
            preferred_service: 'Regular Haircut',
            notes: 'Prefers scissor cut, no clippers on top'
          },
          { 
            id: 'client-2', 
            first_name: 'Michael', 
            last_name: 'Johnson', 
            email: 'michael@example.com',
            phone: '555-987-6543',
            last_visit: '2023-05-28',
            total_visits: 4,
            preferred_service: 'Haircut & Beard Trim',
            notes: 'Always runs 5 minutes late'
          },
          { 
            id: 'client-3', 
            first_name: 'Robert', 
            last_name: 'Williams', 
            email: 'robert@example.com',
            phone: '555-456-7890',
            last_visit: '2023-04-30',
            total_visits: 12,
            preferred_service: 'Fade with Lineup',
            notes: 'Likes to talk about basketball'
          },
          { 
            id: 'client-4', 
            first_name: 'David', 
            last_name: 'Brown', 
            email: 'david@example.com',
            phone: '555-789-0123',
            last_visit: '2023-05-22',
            total_visits: 6,
            preferred_service: 'Senior Cut',
            notes: ''
          },
          { 
            id: 'client-5', 
            first_name: 'James', 
            last_name: 'Jones', 
            email: 'james@example.com',
            phone: '555-321-6547',
            last_visit: '2023-05-10',
            total_visits: 3,
            preferred_service: 'Beard Trim',
            notes: 'New client, referred by Michael Johnson'
          }
        ];
        
        setClients(mockClients);
        setLoading(false);
        return;
      }

      // For real barber, get clients from Supabase
      // This query would find all clients who have appointments with this barber
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          client_id,
          profiles:client_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('barber_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data to remove duplicates and count visits
      const clientMap = new Map();
      data.forEach(appointment => {
        const client = appointment.profiles;
        if (client && !clientMap.has(client.id)) {
          clientMap.set(client.id, {
            ...client,
            total_visits: 1,
            // You'd need additional queries to get these properly
            last_visit: 'Unknown',
            preferred_service: 'Unknown',
            notes: ''
          });
        } else if (client) {
          const existingClient = clientMap.get(client.id);
          existingClient.total_visits += 1;
        }
      });

      setClients(Array.from(clientMap.values()));
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = async (client) => {
    setSelectedClient(client);
    setView('detail');

    // For test barbers, use mock data
    if (user.id.startsWith('test-')) {
      // Mock client notes
      setClientNotes(client.notes || '');
      
      // Mock appointment history
      const mockAppointments = [
        {
          id: 'apt-1',
          date: '2023-05-15',
          service: 'Haircut',
          price: '$25',
          status: 'completed',
          notes: 'Regular customer, tipped well'
        },
        {
          id: 'apt-2',
          date: '2023-04-01',
          service: 'Haircut & Beard Trim',
          price: '$40',
          status: 'completed',
          notes: 'Wanted shorter on sides than usual'
        },
        {
          id: 'apt-3',
          date: '2023-02-15',
          service: 'Haircut',
          price: '$25',
          status: 'no-show',
          notes: 'Client did not show up'
        }
      ];
      
      setClientAppointments(mockAppointments);
      return;
    }

    try {
      // For real barber, fetch client notes from profiles
      const { data: noteData, error: noteError } = await supabase
        .from('profiles')
        .select('notes')
        .eq('id', client.id)
        .single();

      if (!noteError && noteData) {
        setClientNotes(noteData.notes || '');
      }

      // Fetch appointment history
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          notes,
          services:service_id (name, price)
        `)
        .eq('client_id', client.id)
        .eq('barber_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setClientAppointments(appointments);

    } catch (error) {
      console.error('Error fetching client details:', error);
    }
  };

  const saveClientNotes = async () => {
    if (!selectedClient) return;

    // For test barbers, just update the local state
    if (user.id.startsWith('test-')) {
      const updatedClients = clients.map(c => 
        c.id === selectedClient.id ? { ...c, notes: clientNotes } : c
      );
      setClients(updatedClients);
      setSelectedClient({ ...selectedClient, notes: clientNotes });
      alert('Client notes saved!');
      return;
    }

    // For real barbers, update in Supabase
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notes: clientNotes })
        .eq('id', selectedClient.id);

      if (error) throw error;
      alert('Client notes saved successfully!');
    } catch (error) {
      console.error('Error saving client notes:', error);
      alert('Failed to save notes. Please try again.');
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client => 
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Client Management</h2>
      
      {view === 'list' ? (
        <>
          <div style={styles.controls}>
            <div style={styles.searchBar}>
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Total Clients:</span>
                <span style={styles.statValue}>{clients.length}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <p>Loading clients...</p>
          ) : filteredClients.length === 0 ? (
            <p>No clients found</p>
          ) : (
            <div style={styles.clientList}>
              <div style={styles.clientHeader}>
                <span style={{ ...styles.clientColumn, flex: 2 }}>Name</span>
                <span style={styles.clientColumn}>Phone</span>
                <span style={styles.clientColumn}>Last Visit</span>
                <span style={styles.clientColumn}>Visits</span>
                <span style={styles.clientColumn}>Preferred Service</span>
              </div>
              {filteredClients.map(client => (
                <div 
                  key={client.id} 
                  style={styles.clientRow}
                  onClick={() => handleClientSelect(client)}
                >
                  <span style={{ ...styles.clientColumn, flex: 2 }}>
                    {client.first_name} {client.last_name}
                  </span>
                  <span style={styles.clientColumn}>{client.phone}</span>
                  <span style={styles.clientColumn}>{client.last_visit}</span>
                  <span style={styles.clientColumn}>{client.total_visits}</span>
                  <span style={styles.clientColumn}>{client.preferred_service}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={styles.clientDetail}>
          <button 
            style={styles.backButton}
            onClick={() => setView('list')}
          >
            ← Back to Client List
          </button>
          
          <div style={styles.clientHeader}>
            <h3 style={styles.clientName}>
              {selectedClient.first_name} {selectedClient.last_name}
            </h3>
            <div style={styles.clientContact}>
              <div><strong>Email:</strong> {selectedClient.email}</div>
              <div><strong>Phone:</strong> {selectedClient.phone}</div>
              <div><strong>Total Visits:</strong> {selectedClient.total_visits}</div>
            </div>
          </div>
          
          <div style={styles.clientNotesSection}>
            <h4>Client Notes</h4>
            <textarea
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              style={styles.notesTextarea}
              placeholder="Add notes about this client's preferences, hair history, etc."
            />
            <button 
              style={styles.saveButton}
              onClick={saveClientNotes}
            >
              Save Notes
            </button>
          </div>
          
          <div style={styles.appointmentHistory}>
            <h4>Appointment History</h4>
            {clientAppointments.length === 0 ? (
              <p>No appointment history found.</p>
            ) : (
              <div>
                {clientAppointments.map(apt => (
                  <div key={apt.id} style={styles.appointmentCard}>
                    <div style={styles.appointmentHeader}>
                      <span style={styles.appointmentDate}>
                        {typeof apt.date === 'string' ? apt.date : new Date(apt.start_time).toLocaleDateString()}
                      </span>
                      <span style={styles.appointmentStatus}>
                        {apt.status}
                      </span>
                    </div>
                    <div style={styles.appointmentDetails}>
                      <div><strong>Service:</strong> {apt.service || apt.services?.name || 'Unknown'}</div>
                      <div><strong>Price:</strong> {apt.price || (apt.services?.price ? `$${apt.services?.price}` : 'Unknown')}</div>
                      {apt.notes && <div><strong>Notes:</strong> {apt.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
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
    marginBottom: '24px',
    color: '#333'
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  searchBar: {
    flexGrow: 1,
    marginRight: '24px'
  },
  searchInput: {
    padding: '10px 16px',
    width: '100%',
    maxWidth: '400px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '15px'
  },
  stats: {
    display: 'flex'
  },
  statItem: {
    marginLeft: '24px',
    backgroundColor: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginRight: '8px'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  clientList: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  clientHeader: {
    display: 'flex',
    backgroundColor: '#f7f9fc',
    padding: '12px 16px',
    fontWeight: '600',
    color: '#333'
  },
  clientRow: {
    display: 'flex',
    padding: '16px',
    borderTop: '1px solid #eee',
    transition: 'background-color 0.2s',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#f9f9f9'
    }
  },
  clientColumn: {
    flex: 1,
    padding: '0 8px'
  },
  clientDetail: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px'
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
  },
  clientName: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '16px'
  },
  clientContact: {
    marginBottom: '32px',
    lineHeight: '1.6'
  },
  clientNotesSection: {
    marginBottom: '32px'
  },
  notesTextarea: {
    width: '100%',
    height: '120px',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '15px',
    resize: 'vertical',
    marginBottom: '16px'
  },
  saveButton: {
    backgroundColor: '#4a75b5',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  appointmentHistory: {
    marginTop: '24px'
  },
  appointmentCard: {
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  appointmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  appointmentDate: {
    fontSize: '16px',
    fontWeight: '600'
  },
  appointmentStatus: {
    textTransform: 'capitalize',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#e5e7eb',
    color: '#374151'
  },
  appointmentDetails: {
    lineHeight: '1.6'
  }
};

export default ClientManagement;