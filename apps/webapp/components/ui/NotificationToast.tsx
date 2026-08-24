import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface NotificationToastProps {
  message: string | null;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Allow time for fade-out animation before clearing the message
        setTimeout(onClose, 300);
      }, 5000); // Disappear after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  const handleClose = () => {
      setIsVisible(false);
      setTimeout(onClose, 300);
  }

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] pointer-events-none transition-all duration-300 ease-in-out ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
      }`}
    >
      {message && (
        <div className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-2xl border border-gray-100 max-w-lg break-words pointer-events-auto">
          <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
            <Icon name="package" className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-800">Nueva Notificación</p>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationToast;