import React, { useState, useEffect } from 'react';
import { dataStore } from '../../data/dataStore';
import { Booking } from '../../types';

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const eventColors: { [key: string]: { bg: string, text: string, border: string } } = {
    'BBQ': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    'Gimnasio': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    'Salón Social': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    'Default': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
};

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
  
  const handleGoToToday = () => {
      setCurrentDate(new Date());
  }

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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Calendario de Áreas Comunes</h2>
          <p className="text-gray-600 mt-1">
            Consulta las reservas. Para agendar, usa el asistente de IA.
          </p>
        </div>
        <div className="flex items-center gap-2">
            {Object.keys(eventColors).filter(k => k !== 'Default').map(event => (
                <div key={event} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${eventColors[event].bg} border ${eventColors[event].border}`}></div>
                    <span className="text-xs text-gray-600">{event}</span>
                </div>
            ))}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100">&lt;</button>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
                <button onClick={handleGoToToday} className="px-3 py-1.5 text-sm font-semibold border border-gray-300 rounded-md hover:bg-gray-50">Hoy</button>
            </div>
            <h3 className="text-lg font-semibold capitalize text-gray-800">
              {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {daysOfWeek.map(day => <div key={day} className="font-semibold text-gray-600 p-2">{day}</div>)}
          {calendarDays.map((day, i) => {
            const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
            return (
              <div key={i} className={`h-32 border border-gray-100 rounded-md p-1 overflow-y-auto ${!day ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                {day && (
                  <span className={`font-medium flex items-center justify-center w-7 h-7 ${isToday ? 'bg-blue-600 text-white rounded-full' : 'text-gray-700'}`}>
                    {day}
                  </span>
                )}
                <div className="space-y-1 mt-1">
                    {day && bookings.filter(b => b.day === day).map(booking => {
                        const colors = eventColors[booking.event] || eventColors['Default'];
                        return (
                          <div key={booking.event+booking.day+booking.user} className="relative group">
                              <div className={`${colors.bg} ${colors.text} p-1 rounded-md text-xs text-left cursor-pointer`}>
                                  <p className="font-semibold truncate">{booking.event}</p>
                                  <p className="truncate">{booking.user}</p>
                              </div>
                              <div className="absolute z-10 w-48 p-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -mt-24 ml-4">
                                  <p><span className="font-bold">Evento:</span> {booking.event}</p>
                                  <p><span className="font-bold">Reservado por:</span> {booking.user}</p>
                                  <p><span className="font-bold">Horario:</span> {booking.time}</p>
                              </div>
                          </div>
                        )
                    })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default CommonAreasView;