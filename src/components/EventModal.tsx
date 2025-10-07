import React, { useState } from 'react';
import { X, Clock, Users, Award, Calendar, CreditCard as Edit3 } from 'lucide-react';
import { Event, UserProfile, EventRegistration } from '../types';
import { useTranslation } from '../i18n/i18n';

interface EventModalProps {
  event: Event;
  currentUser: UserProfile | null;
  userRegistrations: EventRegistration[];
  onClose: () => void;
  onBook: (eventId: string, seatsRequested: number) => void;
  onUpdate: (event: Event) => void;
}

const EventModal: React.FC<EventModalProps> = ({ 
  event, 
  currentUser, 
  userRegistrations,
  onClose, 
  onBook, 
  onUpdate 
}) => {
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);
  const { t } = useTranslation();

  const isUserRegistered = userRegistrations.some(reg => reg.event_id === event.id);

  const handleBooking = () => {
    if (!currentUser) {
      alert('Please log in to register for events');
      return;
    }

    if (isUserRegistered) {
      alert('You are already registered for this event');
      return;
    }

    if (seatsRequested > event.seats_available) {
      alert('Not enough seats available');
      return;
    }

    if (seatsRequested < 1 || seatsRequested > 4) {
      alert('You can book between 1 and 4 seats');
      return;
    }

    onBook(event.id, seatsRequested);
  };

  const handleStatusChange = (newStatus: 'available' | 'fully-booked' | 'cancelled') => {
    onUpdate({
      ...event,
      status: newStatus
    });
  };

  const handleEventUpdate = () => {
    // Convert datetime-local format to ISO string
    const updatedEvent = {
      ...editedEvent,
      start_time: new Date(editedEvent.start_time).toISOString(),
      end_time: new Date(editedEvent.end_time).toISOString()
    };
    onUpdate(updatedEvent);
    setIsEditing(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'fully-booked': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
          <h2 className="text-xl font-semibold">{event.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('eventModal.title')}</label>
                <input
                  type="text"
                  value={editedEvent.title}
                  onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('events.description')}</label>
                <textarea
                  value={editedEvent.description}
                  onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('eventModal.startTime')}</label>
                  <input
                    type="datetime-local"
                    value={new Date(editedEvent.start_time).toISOString().slice(0, 16)}
                    onChange={(e) => setEditedEvent({ ...editedEvent, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('eventModal.endTime')}</label>
                  <input
                    type="datetime-local"
                    value={new Date(editedEvent.end_time).toISOString().slice(0, 16)}
                    onChange={(e) => setEditedEvent({ ...editedEvent, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('events.difficulty')}</label>
                  <select
                    value={editedEvent.difficulty}
                    onChange={(e) => setEditedEvent({ ...editedEvent, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Beginner">{t('events.difficulties.beginner')}</option>
                    <option value="Intermediate">{t('events.difficulties.intermediate')}</option>
                    <option value="Advanced">{t('events.difficulties.advanced')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('eventModal.totalSeats')}</label>
                  <input
                    type="number"
                    value={editedEvent.total_seats}
                    onChange={(e) => setEditedEvent({ ...editedEvent, total_seats: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('eventModal.availableSeats')}</label>
                  <input
                    type="number"
                    value={editedEvent.seats_available}
                    onChange={(e) => setEditedEvent({ ...editedEvent, seats_available: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleEventUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('eventModal.saveChanges')}
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Event Details */}
              <div>
                <p className="text-gray-600 leading-relaxed">{event.description}</p>
              </div>

              {/* Event Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">{t('events.date')}</p>
                      <p className="font-medium">{new Date(event.start_time).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">{t('events.time')}</p>
                      <p className="font-medium">
                        {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-gray-500">{event.duration} {t('events.minutes')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">{t('events.seatsAvailable')}</p>
                      <p className="font-medium">{event.seats_available} / {event.total_seats}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Award className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">{t('events.difficulty')}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(event.difficulty)}`}>
                        {t(`events.difficulties.${event.difficulty.toLowerCase()}`)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{t('events.status')}:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(event.status)}`}>
                  {t(`events.statuses.${event.status.replace('-', '')}`)}
                </span>
              </div>

              {/* Registration Status */}
              {isUserRegistered && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800 font-medium">✓ {t('events.alreadyRegistered')}</p>
                </div>
              )}

              {/* Registration Section */}
              {currentUser && event.status === 'available' && event.seats_available > 0 && !isUserRegistered && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-3">{t('events.registerForEvent')}</h3>
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm text-blue-700 mb-1">{t('events.seatsRequested')}:</label>
                      <select
                        value={seatsRequested}
                        onChange={(e) => setSeatsRequested(parseInt(e.target.value))}
                        className="px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {[1, 2, 3, 4].filter(n => n <= event.seats_available).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleBooking}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      {t('events.registerNow')}
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Controls */}
              {currentUser?.is_admin && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">{t('eventModal.adminControls')}</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>{t('eventModal.editEvent')}</span>
                    </button>
                    
                    <button
                      onClick={() => handleStatusChange('available')}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {t('eventModal.markAvailable')}
                    </button>
                    
                    <button
                      onClick={() => handleStatusChange('fully-booked')}
                      className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      {t('eventModal.markFull')}
                    </button>
                    
                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      {t('eventModal.cancelEvent')}
                    </button>
                  </div>
                </div>
              )}

              {!currentUser && event.status === 'available' && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-yellow-800">{t('events.loginToRegister')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;