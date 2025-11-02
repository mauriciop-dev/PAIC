import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { Booking, CommonArea, UserProfile } from '../../types';
import ManageAreasModal from '../ManageAreasModal';

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface TooltipData {
    content: Booking;
    x: number;
    y: number;
}

interface CommonAreasViewProps {
  userProfile: UserProfile;
}

const CommonAreasView: React.FC<CommonAreasViewProps> = ({ userProfile }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);


  const fetchData = async () => {
    if (!userProfile.conjuntoId) return;
    setIsLoading(true);
    try {
        const [fetchedBookings, fetchedAreas] = await Promise.all([
            apiService.fetchBookings(userProfile.conjuntoId),
            apiService.fetchCommonAreas(userProfile.conjuntoId),
        ]);
        setBookings(fetchedBookings);
        setCommonAreas(fetchedAreas);
    } catch (error) {
        console.error("Failed to fetch common areas data:", error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile.conjuntoId]);

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
    while (calendarDays.length % 7 !== 0 && calendarDays.length < 42) {
        calendarDays.push(null);
    }
    return calendarDays;
  };

  const handleMouseEnter = (booking: Booking, event: React.MouseEvent) => {
    setTooltip({
      content: booking,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };
  
  const calendarDays = generateCalendarDays();
  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <p className="text-gray-600">
          Consulta las reservas. Para agendar, usa el asistente de IA.
        </p>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap">
                {commonAreas.map(area => (
                    <div key={area.id} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full ${area.color.bg} border ${area.color.border}`}></div>
                        <span className="text-xs text-gray-600">{area.name}</span>
                    </div>
                ))}
            </div>
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md hover:bg-gray-100 bg-white shadow-sm"
            >
                Gestionar Áreas
            </button>
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
        {isLoading ? (
            <div className="text-center py-20 text-gray-500">Cargando calendario...</div>
        ) : (
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {daysOfWeek.map(day => <div key={day} className="font-semibold text-gray-600 p-2">{day}</div>)}
              {calendarDays.map((day, i) => {
                const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                return (
                  <div key={i} className={`h-32 border border-gray-100 rounded-md p-1 ${!day ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                    {day && (
                      <span className={`font-medium flex items-center justify-center w-7 h-7 ${isToday ? 'bg-blue-600 text-white rounded-full' : 'text-gray-700'}`}>
                        {day}
                      </span>
                    )}
                    <div className="space-y-1 mt-1 overflow-y-auto" style={{maxHeight: 'calc(8rem - 2rem)'}}>
                        {day && bookings.filter(b => b.day === day).map(booking => {
                            const area = commonAreas.find(a => a.name === booking.event);
                            const colors = area ? area.color : { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
                            return (
                              <div
                                key={booking.event+booking.day+booking.user}
                                onMouseEnter={(e) => handleMouseEnter(booking, e)}
                                onMouseLeave={handleMouseLeave}
                                className={`${colors.bg} ${colors.text} p-1 rounded-md text-xs text-left cursor-pointer`}
                              >
                                <p className="font-semibold truncate">{booking.event}</p>
                                <p className="truncate">{booking.user}</p>
                              </div>
                            )
                        })}
                    </div>
                  </div>
                )
              })}
            </div>
        )}
      </div>

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: `${tooltip.y + 15}px`,
            left: `${tooltip.x + 15}px`,
            pointerEvents: 'none',
          }}
          className="z-50 w-48 p-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg"
        >
          <p><span className="font-bold">Evento:</span> {tooltip.content.event}</p>
          <p><span className="font-bold">Reservado por:</span> {tooltip.content.user}</p>
          <p><span className="font-bold">Horario:</span> {tooltip.content.time}</p>
        </div>
      )}

      {isManageModalOpen && (
        <ManageAreasModal 
            isOpen={isManageModalOpen} 
            onClose={() => setIsManageModalOpen(false)} 
            onAreaUpdate={fetchData}
            userProfile={userProfile}
        />
      )}
    </div>
  );
};

export default CommonAreasView;