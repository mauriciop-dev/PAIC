
import React from 'react';

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - 3;
    return day > 0 && day <= 31 ? day : null;
});

const bookings = [
    { day: 5, time: '12pm-4pm', event: 'BBQ', user: 'Apt 101' },
    { day: 12, time: '6pm-9pm', event: 'Salón Social', user: 'Apt 202' },
    { day: 18, time: '8am-9am', event: 'Gimnasio', user: 'Apt 301' },
    { day: 25, time: '2pm-6pm', event: 'BBQ', user: 'Apt 102' },
];

const CommonAreasView: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Calendario de Áreas Comunes</h2>
      <p className="text-gray-600 mb-6">
        Consulta las reservas existentes. Para agendar, modificar o cancelar una reserva, por favor utiliza el asistente de IA.
      </p>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <button className="p-2 rounded hover:bg-gray-100">&lt;</button>
            <h3 className="text-lg font-semibold">Junio 2024</h3>
            <button className="p-2 rounded hover:bg-gray-100">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {days.map(day => <div key={day} className="font-semibold text-gray-600 p-2">{day}</div>)}
          {calendarDays.map((day, i) => (
            <div key={i} className={`h-28 border border-gray-100 rounded-md p-1 ${!day ? 'bg-gray-50' : ''}`}>
              {day && <span className="font-medium text-gray-700">{day}</span>}
              {bookings.filter(b => b.day === day).map(booking => (
                  <div key={booking.event+booking.day} className="mt-1 p-1 bg-blue-100 text-blue-800 rounded-md text-xs text-left">
                      <p className="font-semibold truncate">{booking.event}</p>
                      <p className="truncate">{booking.user}</p>
                  </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommonAreasView;
