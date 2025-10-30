import React, { useState, useEffect } from 'react';
import { dataStore } from '../../data/dataStore';
import { Booking } from '../../types';

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CommonAreasView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>(dataStore.getBookings());
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const handleStoreChange = () => {
      setBookings(dataStore.getBookings());
    };
    const unsubscribe = dataStore.subscribe(handleStoreChange);
    return () => unsubscribe();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarDays = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }
    while (calendarDays.length % 7 !== 0 && calendarDays.length < 42) { // Ensure full grid
        calendarDays.push(null);
    }
    return calendarDays;
  };
  
  const calendarDays = generateCalendarDays();
  const today = new Date();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Calendario de Áreas Comunes</h2>
      <p className="text-gray-600 mb-6">
        Consulta las reservas existentes. Para agendar, modificar o cancelar una reserva, por favor utiliza el asistente de IA.
      </p>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="p-2 rounded hover:bg-gray-100">&lt;</button>
            <h3 className="text-lg font-semibold capitalize">
              {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={handleNextMonth} className="p-2 rounded hover:bg-gray-100">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {daysOfWeek.map(day => <div key={day} className="font-semibold text-gray-600 p-2">{day}</div>)}
          {calendarDays.map((day, i) => {
            const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
            return (
              <div key={i} className={`h-28 border border-gray-100 rounded-md p-1 overflow-y-auto ${!day ? 'bg-gray-50' : ''}`}>
                {day && (
                  <span className={`font-medium flex items-center justify-center w-6 h-6 ${isToday ? 'bg-blue-600 text-white rounded-full' : 'text-gray-700'}`}>
                    {day}
                  </span>
                )}
                {day && bookings.filter(b => b.day === day).map(booking => (
                  <div key={booking.event+booking.day} className="mt-1 p-1 bg-blue-100 text-blue-800 rounded-md text-xs text-left">
                      <p className="font-semibold truncate">{booking.event}</p>
                      <p className="truncate">{booking.user}</p>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default CommonAreasView;