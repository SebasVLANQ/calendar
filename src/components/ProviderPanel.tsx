import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, Plus, Eye, Edit3, Trash2 } from 'lucide-react';
import { Event, UserProfile, EventRegistration } from '../types';
import { supabase } from '../lib/supabase';
import AddEventModal from './AddEventModal';
import EventRegistrationsModal from './EventRegistrationsModal';
import { useTranslation } from '../i18n/i18n';

interface ProviderPanelProps {
  events: Event[];
  currentUser: UserProfile;
  onClose: () => void;
  onEventsUpdate: () => void;
}

const ProviderPanel: React.FC<ProviderPanelProps> = ({ 
  events, 
  currentUser,
  onClose, 
  onEventsUpdate 
}) => {
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Filter events owned by the current provider
  const providerEvents = events.filter(event => event.event_owner_id === currentUser.id);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*');

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: 'available' | 'fully-booked' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId);

      if (error) throw error;
      onEventsUpdate();
    } catch (error) {
      console.error('Error updating event status:', error);
      alert('Error updating event status');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      onEventsUpdate();
      alert('Event deleted successfully!');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
    }
  };

  const handleViewRegistrations = (event: Event) => {
    setSelectedEvent(event);
    setShowRegistrationsModal(true);
  };

  const getEventRegistrations = (eventId: string) => {
    return registrations.filter(reg => reg.event_id === eventId);
  };

  const totalEvents = providerEvents.length;
  const availableEvents = providerEvents.filter(e => e.status === 'available').length;
  const totalRegistrations = registrations.filter(reg => 
    providerEvents.some(event => event.id === reg.event_id)
  ).length;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-xl">
          <h2 className="text-xl font-semibold">{t('provider.providerPanel')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Statistics */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-100 text-green-800 p-3 rounded-lg">
                <Calendar className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalEvents}</p>
                <p className="text-sm">{t('provider.myEvents')}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-800 p-3 rounded-lg">
                <Calendar className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">{availableEvents}</p>
                <p className="text-sm">{t('provider.availableEvents')}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 text-purple-800 p-3 rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">{totalRegistrations}</p>
                <p className="text-sm">{t('provider.totalBookings')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">{t('provider.eventManagement')}</h3>
            <button 
              onClick={() => setShowAddEventModal(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{t('provider.addEvent')}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {providerEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('provider.noEvents')}</h3>
                <p className="text-gray-500 mb-4">{t('provider.noEventsDescription')}</p>
                <button 
                  onClick={() => setShowAddEventModal(true)}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('provider.createFirstEvent')}</span>
                </button>
              </div>
            ) : (
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Event</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Seats</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Registrations</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {providerEvents.map(event => {
                    const eventRegistrations = getEventRegistrations(event.id);
                    const totalSeatsBooked = eventRegistrations.reduce((sum, reg) => sum + reg.seats_requested, 0);
                    
                    return (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">
                          <div>
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-gray-600">{event.difficulty}</p>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div>
                            <p className="text-sm">{new Date(event.start_time).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <p>{event.seats_available} / {event.total_seats}</p>
                          <p className="text-xs text-gray-600">Booked: {totalSeatsBooked}</p>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <select
                            value={event.status}
                            onChange={(e) => handleStatusChange(event.id, e.target.value as any)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="available">Available</option>
                            <option value="fully-booked">Full</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <button
                            onClick={() => handleViewRegistrations(event)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {eventRegistrations.length} users
                          </button>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleViewRegistrations(event)}
                              className="flex items-center space-x-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEventModal && (
        <AddEventModal
          eventOwnerId={currentUser.id}
          onClose={() => setShowAddEventModal(false)}
          onEventAdded={onEventsUpdate}
        />
      )}

      {/* Event Registrations Modal */}
      {showRegistrationsModal && selectedEvent && (
        <EventRegistrationsModal
          event={selectedEvent}
          registrations={registrations}
          users={[]} // Providers don't need to see user details for privacy
          onClose={() => {
            setShowRegistrationsModal(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};

export default ProviderPanel;