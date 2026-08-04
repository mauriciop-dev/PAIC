import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import { CommonArea, UserProfile, Reservation } from '../../types';
import BookingModal from '../BookingModal';
import { Icon } from '../ui/Icon';

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface CalendarEvent {
    key: string;
    day: number;
    event: string;
    user: string;
    time: string;
    color: { bg: string; text: string; border: string };
    fullDetails: Reservation;
    type: 'reservation';
}

interface TooltipData {
    content: CalendarEvent;
    x: number;
    y: number;
}

const areaIconPaths: Record<string, React.ReactNode> = {
  pool: (
    <>
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </>
  ),
  dumbbell: (
    <>
      <path d="m6.5 6.5 11 11" /><path d="m21 21-1-1" /><path d="m3 3 1 1" /><path d="m18 22 4-4" /><path d="m2 6 4-4" /><path d="m3 10 7-7" /><path d="m14 21 7-7" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3v18" />
    </>
  ),
  flame: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  sofa: (
    <>
      <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" /><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z" /><path d="M4 18v2" /><path d="M20 18v2" />
    </>
  ),
  tree: (
    <>
      <path d="M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z" /><path d="M12 19v3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  building: (
    <>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </>
  ),
};

const normalizeAreaName = (name: string) =>
  (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getAreaIconName = (name: string): keyof typeof areaIconPaths => {
  const n = normalizeAreaName(name);
  if (n.includes('piscina') || n.includes('pool')) return 'pool';
  if (n.includes('gimnasio') || n.includes('gym')) return 'dumbbell';
  if (n.includes('cancha') || n.includes('tenis')) return 'ball';
  if (n.includes('parrilla') || n.includes('barbecue') || n.includes('bbq') || n.includes('asador')) return 'flame';
  if (n.includes('salon') || n.includes('eventos') || n.includes('social')) return 'sofa';
  if (n.includes('parque') || n.includes('jard') || n.includes('infantil') || n.includes('juegos')) return 'tree';
  if (n.includes('jacuzzi') || n.includes('sauna') || n.includes('spa') || n.includes('turco')) return 'pool';
  if (n.includes('terraza') || n.includes('azotea')) return 'sun';
  return 'building';
};

interface AreaIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
}

const AreaIcon: React.FC<AreaIconProps> = ({ name, ...props }) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {areaIconPaths[getAreaIconName(name)]}
  </svg>
);

interface CommonAreasViewProps {
  userProfile: UserProfile;
}

const CommonAreasView: React.FC<CommonAreasViewProps> = ({ userProfile }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  const defaultColor = { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };

  const fetchData = useCallback(async () => {
    if (!userProfile.conjuntoId) return;
    setIsLoading(true);
    try {
        const [fetchedAreas, fetchedReservations] = await Promise.all([
            apiService.fetchCommonAreas(userProfile.conjuntoId),
            apiService.fetchReservations(userProfile.conjuntoId),
        ]);
        setCommonAreas(fetchedAreas);
        setReservations(fetchedReservations);
    } catch (error) {
        console.error("Failed to fetch common areas data:", error);
    } finally {
        setIsLoading(false);
    }
  }, [userProfile.conjuntoId]);

  useEffect(() => {
    fetchData(); // Initial fetch
    
    // Listen for custom event to refetch data when chatbot makes a change
    const handleDataChange = () => {
      fetchData();
    };
    window.addEventListener('data-changed', handleDataChange);

    return () => {
      window.removeEventListener('data-changed', handleDataChange);
    };
  }, [fetchData]);
  
  const handleSaveReservation = async (reservation: Omit<Reservation, 'id'>) => {
    if(!userProfile.conjuntoId) return;
    try {
        await apiService.addReservation(userProfile.conjuntoId, reservation);
        setIsBookingModalOpen(false);
        fetchData();
    } catch (error) {
        console.error("Failed to save reservation:", error);
        // Here you could pass the error to the modal to display it
        throw error;
    }
  };

  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    reservations.forEach(reservation => {
        const area = commonAreas.find(a => a.id === reservation.commonAreaId);
        if (!area) return;

        const reservationDate = new Date(reservation.date + 'T00:00:00-05:00'); // Assume Colombia Timezone
        if (reservationDate.getFullYear() === currentDate.getFullYear() && reservationDate.getMonth() === currentDate.getMonth()) {
            events.push({
                key: `reservation-${reservation.id}`,
                day: reservationDate.getDate(),
                event: area.name,
                user: reservation.residentName || `Apto ${reservation.apartment}`,
                time: `${reservation.startTime} - ${reservation.endTime}`,
                color: area.color || defaultColor,
                fullDetails: reservation,
                type: 'reservation'
            });
        }
    });

    return events;
  }, [reservations, commonAreas, currentDate]);


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

  const handleMouseEnter = (eventData: CalendarEvent, event: React.MouseEvent) => {
    setTooltip({
      content: eventData,
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
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 md:flex-wrap md:overflow-visible md:gap-3">
        {commonAreas.map(area => {
            const color = area.color || defaultColor; // Defensive check
            return (
                <div
                  key={area.id}
                  className={`flex flex-col items-center gap-1.5 shrink-0 min-w-[88px] md:min-w-[120px] px-3 py-3 rounded-xl border ${color.border} ${color.bg} shadow-sm`}
                >
                    <AreaIcon name={area.name} className={`w-6 h-6 ${color.text}`} />
                    <span className="text-xs md:text-sm font-medium text-gray-700 text-center leading-tight">{area.name}</span>
                </div>
            );
        })}
      </div>

      <div className="flex justify-center md:justify-end">
        <button
          id="btn-agregar-reserva"
          onClick={() => setIsBookingModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 text-sm"
        >
            <Icon name="calendar" className="w-4 h-4" />
            Agregar Reserva
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} aria-label="Mes anterior" className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">&lt;</button>
                <button onClick={handleNextMonth} aria-label="Mes siguiente" className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">&gt;</button>
            </div>
            <h3 className="text-lg md:text-xl font-semibold capitalize text-gray-800">
              {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={handleGoToToday} className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50 transition-colors">Hoy</button>
        </div>
        {isLoading ? (
            <div className="text-center py-20 text-gray-500">Cargando calendario...</div>
        ) : (
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {daysOfWeek.map(day => <div key={day} className="font-semibold text-gray-500 p-2 text-xs md:text-sm">{day}</div>)}
              {calendarDays.map((day, i) => {
                const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                const isSelected = day === selectedDay;
                return (
                  <div key={i} className={`h-28 md:h-32 rounded-lg border p-1 ${!day ? 'bg-gray-50 border-transparent' : isSelected ? 'border-blue-300 bg-blue-50/60' : 'border-gray-100 hover:bg-gray-50'}`}>
                    {day && (
                      <button
                        onClick={() => setSelectedDay(day)}
                        aria-pressed={isSelected}
                        className={`w-9 h-9 flex items-center justify-center rounded-full text-lg font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300 shadow-md'
                            : isToday
                            ? 'border-2 border-blue-600 text-blue-700 font-bold'
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    )}
                    <div className="space-y-1 mt-1 overflow-y-auto max-h-[3.5rem] md:max-h-[6rem]">
                        {day && calendarEvents.filter(b => b.day === day).map(booking => {
                            const colors = booking.color;
                            return (
                              <div
                                key={booking.key}
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
          className="z-50 w-56 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg"
        >
          {tooltip.content.type === 'reservation' && (
              <>
                <p><span className="font-bold">Área:</span> {tooltip.content.event}</p>
                <p><span className="font-bold">Residente:</span> {tooltip.content.fullDetails.residentName}</p>
                <p><span className="font-bold">Apto:</span> {tooltip.content.fullDetails.apartment}</p>
                <p><span className="font-bold">Horario:</span> {tooltip.content.time}</p>
                <p><span className="font-bold">Tel:</span> {tooltip.content.fullDetails.phone}</p>
              </>
          )}
        </div>
      )}

      {isBookingModalOpen && (
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            onSave={handleSaveReservation}
            userProfile={userProfile}
            commonAreas={commonAreas}
          />
      )}
    </div>
  );
};

export default CommonAreasView;