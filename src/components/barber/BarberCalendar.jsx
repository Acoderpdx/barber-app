import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

const BarberCalendar = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarView, setCalendarView] = useState('week'); // 'day', 'week', 'month'
  const [newAppointment, setNewAppointment] = useState({
    client_id: '',
    service_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    duration: 30,
    notes: ''
  });
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);

  // Initial data loading
  useEffect(() => {
    fetchCalendarData();
    generateTimeSlots();
  }, [user]);

  // Update calendar days when view or selected date changes
  useEffect(() => {
    generateCalendarDays();
  }, [calendarView, selectedDate]);

  // Fetch appointments when calendar days change
  useEffect(() => {
    if (calendarDays.length > 0) {
      fetchAppointmentsForDays();
    }
  }, [calendarDays]);

  const fetchCalendarData = async () => {
    setLoading(true);

    try {
      // For test barber, load mock data
      if (user.id.startsWith('test-')) {
        // Mock services
        const mockServices = [
          { id: 1, name: 'Haircut', duration: 30, price: 25 },
          { id: 2, name: 'Beard Trim', duration: 15, price: 15 },
          { id: 3, name: 'Full Service', duration: 45, price: 40 },
          { id: 4, name: 'Hair Coloring', duration: 90, price: 60 },
          { id: 5, name: 'Kids Cut', duration: 20, price: 18 }
        ];

        // Mock clients
        const mockClients = [
          { id: 'client-1', first_name: 'John', last_name: 'Smith', email: 'john@example.com', phone: '555-123-4567' },
          { id: 'client-2', first_name: 'Michael', last_name: 'Johnson', email: 'michael@example.com', phone: '555-987-6543' },
          { id: 'client-3', first_name: 'Robert', last_name: 'Williams', email: 'robert@example.com', phone: '555-456-7890' },
          { id: 'client-4', first_name: 'David', last_name: 'Brown', email: 'david@example.com', phone: '555-789-0123' },
          { id: 'client-5', first_name: 'James', last_name: 'Jones', email: 'james@example.com', phone: '555-321-6547' }
        ];

        setServices(mockServices);
        setClients(mockClients);
        
        // We'll load mock appointments in fetchAppointmentsForDays
        setLoading(false);
        return;
      }

      // For real barber, get tenant ID first
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
        
      if (userError) throw userError;
      const tenantId = userData.tenant_id;

      // Use tenant ID to filter services and other queries
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Fetch previous clients
      const { data: appointmentsData, error: appointmentsError } = await supabase
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

      if (appointmentsError) throw appointmentsError;

      // Extract unique clients
      const uniqueClients = new Map();
      appointmentsData.forEach(appointment => {
        if (appointment.profiles && !uniqueClients.has(appointment.profiles.id)) {
          uniqueClients.set(appointment.profiles.id, appointment.profiles);
        }
      });

      setClients(Array.from(uniqueClients.values()));
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentsForDays = async () => {
    if (!calendarDays.length) return;
    
    const startDate = calendarDays[0].date;
    const endDate = calendarDays[calendarDays.length - 1].date;
    
    try {
      // For test barber, generate mock appointments
      if (user.id.startsWith('test-')) {
        const mockAppointments = generateMockAppointments();
        setAppointments(mockAppointments);
        return;
      }

      // For real barber, fetch from Supabase
      // Get tenant ID first
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
        
      if (userError) throw userError;

      // Include tenant filtering in appointment query
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, 
          client_id,
          service_id,
          start_time,
          end_time,
          status,
          notes,
          profiles:client_id (first_name, last_name),
          services:service_id (name)
        `)
        .eq('barber_id', user.id)
        .eq('tenant_id', userData.tenant_id) // Filter by tenant
        .gte('start_time', startDate + 'T00:00:00')
        .lte('start_time', endDate + 'T23:59:59')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const generateMockAppointments = () => {
    const mockAppointments = [];
    const currentDate = new Date();
    
    // Generate 10-15 appointments over the next 2 weeks
    const numberOfAppointments = 10 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < numberOfAppointments; i++) {
      // Random day within +/- 7 days from now
      const appointmentDate = new Date(currentDate);
      appointmentDate.setDate(currentDate.getDate() - 7 + Math.floor(Math.random() * 14));
      
      // Random time between 9am and 5pm
      const hour = 9 + Math.floor(Math.random() * 8);
      const minute = Math.random() > 0.5 ? 30 : 0;
      appointmentDate.setHours(hour, minute, 0, 0);
      
      // Random client and service
      const clientIndex = Math.floor(Math.random() * clients.length);
      const serviceIndex = Math.floor(Math.random() * services.length);
      const client = clients[clientIndex];
      const service = services[serviceIndex];
      
      const endTime = new Date(appointmentDate);
      endTime.setMinutes(endTime.getMinutes() + service.duration);
      
      mockAppointments.push({
        id: `mock-appointment-${i}`,
        client_id: client.id,
        profiles: {
          first_name: client.first_name,
          last_name: client.last_name
        },
        service_id: service.id,
        services: {
          name: service.name
        },
        start_time: appointmentDate.toISOString(),
        end_time: endTime.toISOString(),
        notes: Math.random() > 0.5 ? 'Some notes for this appointment' : '',
        status: Math.random() > 0.2 ? 'scheduled' : (Math.random() > 0.5 ? 'completed' : 'cancelled')
      });
    }
    
    return mockAppointments;
  };

  const generateCalendarDays = () => {
    const days = [];
    const startDate = new Date(selectedDate);
    
    if (calendarView === 'day') {
      // Day view - just use selected date
      days.push({
        date: startDate.toISOString().split('T')[0],
        dayName: getDayName(startDate),
        dayNumber: startDate.getDate()
      });
    } else if (calendarView === 'week') {
      // Week view - show 7 days starting from current week's Sunday
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek); // Move to Sunday
      
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        days.push({
          date: currentDate.toISOString().split('T')[0],
          dayName: getDayName(currentDate),
          dayNumber: currentDate.getDate()
        });
      }
    } else if (calendarView === 'month') {
      // Month view - show entire month
      startDate.setDate(1); // Start at 1st of month
      const month = startDate.getMonth();
      
      while (startDate.getMonth() === month) {
        days.push({
          date: new Date(startDate).toISOString().split('T')[0],
          dayName: getDayName(startDate),
          dayNumber: startDate.getDate()
        });
        startDate.setDate(startDate.getDate() + 1);
      }
    }
    
    setCalendarDays(days);
  };

  const generateTimeSlots = () => {
    const slots = [];
    
    // Generate time slots from 8am to 8pm in 30-minute increments
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    
    setTimeSlots(slots);
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const handleDateChange = (offset) => {
    const newDate = new Date(selectedDate);
    
    if (calendarView === 'day') {
      newDate.setDate(newDate.getDate() + offset);
    } else if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() + (offset * 7));
    } else if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() + offset);
    }
    
    setSelectedDate(newDate);
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const closeAppointmentDetail = () => {
    setSelectedAppointment(null);
  };

  const handleNewAppointmentChange = (e) => {
    const { name, value } = e.target;
    setNewAppointment(prev => ({ ...prev, [name]: value }));
  };

  const createAppointment = async () => {
    try {
      setLoading(true);
      
      // Create ISO date-time strings
      const startDateTime = `${newAppointment.date}T${newAppointment.time}:00`;
      
      // Calculate end time based on service duration
      const serviceObj = services.find(s => s.id == newAppointment.service_id);
      const durationMinutes = serviceObj ? serviceObj.duration : 30;
      
      const startTime = new Date(startDateTime);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);
      
      // For test barber, add to local state only
      if (user.id.startsWith('test-')) {
        const clientObj = clients.find(c => c.id === newAppointment.client_id);
        
        const newAppointmentObj = {
          id: `mock-appointment-${Date.now()}`,
          client_id: newAppointment.client_id,
          service_id: newAppointment.service_id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: newAppointment.notes,
          status: 'scheduled',
          profiles: {
            first_name: clientObj?.first_name || 'Client',
            last_name: clientObj?.last_name || 'Name'
          },
          services: {
            name: serviceObj?.name || 'Service'
          }
        };
        
        setAppointments(prev => [...prev, newAppointmentObj]);
        setShowNewAppointmentForm(false);
        setNewAppointment({
          client_id: '',
          service_id: '',
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          duration: 30,
          notes: ''
        });
        
        alert('Appointment created successfully!');
        setLoading(false);
        return;
      }
      
      // For real barber, save to Supabase
      // Get the user's tenant ID
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        console.error('Error fetching user tenant data:', userError);
        throw userError;
      }

      // Now use the tenant_id in your appointment creation
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          barber_id: user.id,
          client_id: newAppointment.client_id,
          service_id: newAppointment.service_id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: newAppointment.notes,
          status: 'scheduled',
          tenant_id: userData.tenant_id // Add the tenant_id here
        }])
        .select();

      if (error) throw error;

      // Fetch the client and service details
      const clientObj = clients.find(c => c.id === newAppointment.client_id);
      // Use the existing serviceObj instead of declaring a new one
      // (serviceObj was previously declared when calculating duration)

      // Add the fetched data to the appointment
      const newAppointmentWithDetails = {
        ...data[0],
        profiles: {
          first_name: clientObj?.first_name || 'Client',
          last_name: clientObj?.last_name || 'Name'
        },
        services: {
          name: serviceObj?.name || 'Service'
        }
      };
      
      setAppointments(prev => [...prev, newAppointmentWithDetails]);
      setShowNewAppointmentForm(false);
      setNewAppointment({
        client_id: '',
        service_id: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        duration: 30,
        notes: ''
      });
      
      alert('Appointment created successfully!');
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment.');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointment = async (id, updates) => {
    try {
      setLoading(true);
      
      // For test barber, update in local state only
      if (user.id.startsWith('test-') || id.startsWith('mock-')) {
        setAppointments(prev => 
          prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
        );
        
        alert('Appointment updated!');
        closeAppointmentDetail();
        setLoading(false);
        return;
      }
      
      // For real barber, update in Supabase
      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
      );
      
      alert('Appointment updated successfully!');
      closeAppointmentDetail();
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment.');
    } finally {
      setLoading(false);
    }
  };

  const deleteAppointment = async (id) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
      setLoading(true);
      
      // For test barber, remove from local state only
      if (user.id.startsWith('test-') || id.startsWith('mock-')) {
        setAppointments(prev => prev.filter(apt => apt.id !== id));
        alert('Appointment deleted!');
        closeAppointmentDetail();
        setLoading(false);
        return;
      }
      
      // For real barber, delete from Supabase
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      alert('Appointment deleted successfully!');
      closeAppointmentDetail();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment.');
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsForDay = (day) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time).toISOString().split('T')[0];
      return aptDate === day;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  };

  // Format time for display
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4ade80';
      case 'cancelled': return '#f87171';
      case 'no-show': return '#f97316';
      default: return '#60a5fa';
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.pageTitle}>Barber Schedule</h2>

      <div style={styles.calendarHeader}>
        <div style={styles.viewToggle}>
          <button 
            style={{ 
              ...styles.viewButton, 
              ...(calendarView === 'day' ? styles.activeViewButton : {}) 
            }}
            onClick={() => setCalendarView('day')}
          >
            Day
          </button>
          <button 
            style={{ 
              ...styles.viewButton, 
              ...(calendarView === 'week' ? styles.activeViewButton : {}) 
            }}
            onClick={() => setCalendarView('week')}
          >
            Week
          </button>
          <button 
            style={{ 
              ...styles.viewButton, 
              ...(calendarView === 'month' ? styles.activeViewButton : {}) 
            }}
            onClick={() => setCalendarView('month')}
          >
            Month
          </button>
        </div>
        <div style={styles.navButtons}>
          <button onClick={() => handleDateChange(-1)} style={styles.navButton}>
            &lt; Previous
          </button>
          <div style={styles.currentDate}>
            {selectedDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric',
              ...(calendarView === 'day' ? { day: 'numeric' } : {})
            })}
          </div>
          <button onClick={() => handleDateChange(1)} style={styles.navButton}>
            Next &gt;
          </button>
        </div>
        <button 
          style={styles.addButton}
          onClick={() => setShowNewAppointmentForm(true)}
        >
          + New Appointment
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}>
          <p>Loading calendar...</p>
        </div>
      ) : (
        <div style={styles.calendarContainer}>
          {calendarView === 'month' ? (
            // Month view
            <div style={styles.monthCalendar}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <div key={`header-${i}`} style={styles.monthDayHeader}>
                  {day}
                </div>
              ))}
              
              {/* Add empty cells before the first day */}
              {Array.from({ length: new Date(calendarDays[0]?.date)?.getDay() || 0 }).map((_, i) => (
                <div key={`empty-${i}`} style={styles.emptyDay}></div>
              ))}
              
              {calendarDays.map((day, index) => {
                const dayAppointments = getAppointmentsForDay(day.date);
                return (
                  <div 
                    key={day.date} 
                    style={styles.monthDay}
                    onClick={() => {
                      setSelectedDate(new Date(day.date));
                      setCalendarView('day');
                    }}
                  >
                    <div style={styles.monthDayNumber}>{day.dayNumber}</div>
                    <div style={styles.monthDayAppointments}>
                      {dayAppointments.slice(0, 2).map(apt => (
                        <div 
                          key={apt.id} 
                          style={{
                            ...styles.monthAppointmentDot,
                            backgroundColor: getStatusColor(apt.status)
                          }}
                          title={`${formatTime(apt.start_time)} - ${apt.profiles.first_name} ${apt.profiles.last_name}`}
                        />
                      ))}
                      {dayAppointments.length > 2 && (
                        <div style={styles.moreAppointments}>+{dayAppointments.length - 2}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Week/Day view
            <div style={styles.weekCalendar}>
              {/* Day headers */}
              <div style={styles.headerRow}>
                <div style={styles.timeHeaderCell}></div>
                {calendarDays.map(day => (
                  <div key={day.date} style={styles.dayHeaderCell}>
                    <div style={styles.dayName}>{day.dayName}</div>
                    <div style={styles.dayNumber}>{day.dayNumber}</div>
                  </div>
                ))}
              </div>
              
              {/* Time slots */}
              <div style={styles.calendarBody}>
                {timeSlots.map(time => (
                  <div key={time} style={styles.timeRow}>
                    <div style={styles.timeCell}>{time}</div>
                    {calendarDays.map(day => {
                      const dayAppointments = getAppointmentsForDay(day.date);
                      const timeAppointments = dayAppointments.filter(apt => {
                        const aptTime = new Date(apt.start_time).toTimeString().substring(0, 5);
                        return aptTime === time;
                      });
                      
                      return (
                        <div key={`${day.date}-${time}`} style={styles.dayTimeCell}>
                          {timeAppointments.map(apt => (
                            <div 
                              key={apt.id}
                              style={{
                                ...styles.appointmentCard,
                                borderLeftColor: getStatusColor(apt.status)
                              }}
                              onClick={() => handleAppointmentClick(apt)}
                            >
                              <div style={styles.appointmentTime}>
                                {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                              </div>
                              <div style={styles.appointmentClient}>
                                {apt.profiles?.first_name} {apt.profiles?.last_name}
                              </div>
                              <div style={styles.appointmentService}>
                                {apt.services?.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Appointment Modal */}
      {showNewAppointmentForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>New Appointment</h3>
            
            <div style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Client</label>
                <select 
                  name="client_id"
                  value={newAppointment.client_id}
                  onChange={handleNewAppointmentChange}
                  style={styles.formSelect}
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Service</label>
                <select 
                  name="service_id"
                  value={newAppointment.service_id}
                  onChange={handleNewAppointmentChange}
                  style={styles.formSelect}
                  required
                >
                  <option value="">Select a service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.duration} min) - ${service.price}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Date</label>
                  <input 
                    type="date"
                    name="date"
                    value={newAppointment.date}
                    onChange={handleNewAppointmentChange}
                    style={styles.formInput}
                    required
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Time</label>
                  <input 
                    type="time"
                    name="time"
                    value={newAppointment.time}
                    onChange={handleNewAppointmentChange}
                    style={styles.formInput}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Notes</label>
                <textarea 
                  name="notes"
                  value={newAppointment.notes}
                  onChange={handleNewAppointmentChange}
                  style={styles.formTextarea}
                  placeholder="Add any notes about this appointment"
                />
              </div>

              <div style={styles.formButtons}>
                <button 
                  onClick={() => setShowNewAppointmentForm(false)}
                  style={styles.cancelButton}
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  onClick={createAppointment}
                  style={styles.submitButton}
                  type="button"
                  disabled={loading || !newAppointment.client_id || !newAppointment.service_id}
                >
                  {loading ? 'Creating...' : 'Create Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Appointment Details</h3>
            
            <div style={styles.appointmentDetail}>
              <div style={styles.detailRow}>
                <strong>Client:</strong>
                <span>{selectedAppointment.profiles?.first_name} {selectedAppointment.profiles?.last_name}</span>
              </div>
              
              <div style={styles.detailRow}>
                <strong>Service:</strong>
                <span>{selectedAppointment.services?.name}</span>
              </div>
              
              <div style={styles.detailRow}>
                <strong>Date:</strong>
                <span>{new Date(selectedAppointment.start_time).toLocaleDateString()}</span>
              </div>
              
              <div style={styles.detailRow}>
                <strong>Time:</strong>
                <span>{formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</span>
              </div>
              
              <div style={styles.detailRow}>
                <strong>Status:</strong>
                <select
                  value={selectedAppointment.status}
                  onChange={(e) => {
                    setSelectedAppointment({
                      ...selectedAppointment,
                      status: e.target.value
                    });
                  }}
                  style={{ 
                    ...styles.statusSelect,
                    backgroundColor: getStatusColor(selectedAppointment.status) + '20', // Add transparency
                    borderColor: getStatusColor(selectedAppointment.status)
                  }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No-Show</option>
                </select>
              </div>
              
              <div style={styles.detailRow}>
                <strong>Notes:</strong>
                <textarea
                  value={selectedAppointment.notes || ''}
                  onChange={(e) => {
                    setSelectedAppointment({
                      ...selectedAppointment,
                      notes: e.target.value
                    });
                  }}
                  style={styles.notesTextarea}
                  placeholder="Add notes for this appointment"
                />
              </div>
              
              <div style={styles.detailButtons}>
                <button 
                  onClick={() => deleteAppointment(selectedAppointment.id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
                <button 
                  onClick={closeAppointmentDetail}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => updateAppointment(selectedAppointment.id, {
                    status: selectedAppointment.status,
                    notes: selectedAppointment.notes
                  })}
                  style={styles.saveButton}
                >
                  Save Changes
                </button>
              </div>
            </div>
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
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    padding: '4px',
  },
  viewButton: {
    background: 'none',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  activeViewButton: {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  navButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  navButton: {
    background: 'none',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a75b5'
  },
  currentDate: {
    fontSize: '16px',
    fontWeight: '500'
  },
  addButton: {
    backgroundColor: '#4a75b5',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '300px',
    backgroundColor: 'white',
    borderRadius: '8px'
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  
  // Month view styles
  monthCalendar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    backgroundColor: '#e5e7eb'
  },
  monthDayHeader: {
    backgroundColor: '#f8fafc',
    padding: '10px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b'
  },
  emptyDay: {
    backgroundColor: '#f8fafc',
    minHeight: '100px'
  },
  monthDay: {
    backgroundColor: 'white',
    minHeight: '100px',
    padding: '8px',
    cursor: 'pointer'
  },
  monthDayNumber: {
    fontSize: '14px',
    marginBottom: '8px',
    fontWeight: '500'
  },
  monthDayAppointments: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap'
  },
  monthAppointmentDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#60a5fa'
  },
  moreAppointments: {
    fontSize: '10px',
    color: '#64748b'
  },
  
  // Week/Day view styles
  weekCalendar: {
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
    overflow: 'auto'
  },
  headerRow: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    zIndex: 1
  },
  timeHeaderCell: {
    width: '80px',
    padding: '10px',
    backgroundColor: '#f8fafc',
    borderRight: '1px solid #e5e7eb'
  },
  dayHeaderCell: {
    flex: 1,
    padding: '10px',
    textAlign: 'center',
    borderRight: '1px solid #e5e7eb'
  },
  dayName: {
    fontSize: '12px',
    color: '#64748b'
  },
  dayNumber: {
    fontSize: '16px',
    fontWeight: '500'
  },
  calendarBody: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  timeRow: {
    display: 'flex',
    borderBottom: '1px solid #f1f5f9',
    minHeight: '60px'
  },
  timeCell: {
    width: '80px',
    padding: '10px',
    fontSize: '12px',
    color: '#64748b',
    borderRight: '1px solid #e5e7eb',
    textAlign: 'right',
    paddingRight: '10px'
  },
  dayTimeCell: {
    flex: 1,
    borderRight: '1px solid #e5e7eb',
    padding: '2px',
    position: 'relative'
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: '4px',
    borderLeft: '3px solid #60a5fa',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    padding: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    marginBottom: '4px',
    transition: 'transform 0.1s, box-shadow 0.1s',
    ':hover': {
      transform: 'scale(1.02)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
    }
  },
  appointmentTime: {
    fontSize: '11px',
    color: '#64748b',
    marginBottom: '2px'
  },
  appointmentClient: {
    fontWeight: '500',
    marginBottom: '2px'
  },
  appointmentService: {
    color: '#64748b'
  },
  
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '16px'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
  },
  formRow: {
    display: 'flex',
    gap: '16px'
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4b5563'
  },
  formInput: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },
  formSelect: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  formTextarea: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical'
  },
  formButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px'
  },
  cancelButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    fontSize: '14px',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#4a75b5',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer'
  },
  
  // Appointment detail styles
  appointmentDetail: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statusSelect: {
    padding: '8px',
    borderRadius: '4px',
    fontSize: '14px',
    border: '1px solid #d1d5db'
  },
  notesTextarea: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical',
    width: '100%'
  },
  detailButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px'
  },
  deleteButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    fontSize: '14px',
    cursor: 'pointer',
    marginRight: 'auto'
  },
  saveButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#4a75b5',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer'
  }
};

export default BarberCalendar;