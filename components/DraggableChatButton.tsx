
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from './ui/Icon';

interface DraggableChatButtonProps {
  isChatbotOpen: boolean;
  onClick: () => void;
}

const DraggableChatButton: React.FC<DraggableChatButtonProps> = ({ isChatbotOpen, onClick }) => {
  const [posY, setPosY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartY = useRef(0);
  const dragStartPosY = useRef(0);
  const hasMoved = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPosY(Math.round(window.innerHeight / 2));
  }, []);

  const clampY = useCallback((y: number) => {
    const btnHeight = buttonRef.current?.offsetHeight || 64;
    const minY = btnHeight / 2 + 8;
    const maxY = window.innerHeight - btnHeight / 2 - 8;
    return Math.max(minY, Math.min(maxY, y));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    hasMoved.current = false;
    dragStartY.current = e.clientY;
    dragStartPosY.current = posY ?? window.innerHeight / 2;
    setIsDragging(true);
    e.preventDefault();
  }, [posY]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = e.clientY - dragStartY.current;
      if (Math.abs(deltaY) > 4) hasMoved.current = true;
      setPosY(clampY(dragStartPosY.current + deltaY));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampY]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDraggingRef.current = true;
    hasMoved.current = false;
    dragStartY.current = e.touches[0].clientY;
    dragStartPosY.current = posY ?? window.innerHeight / 2;
    setIsDragging(true);
  }, [posY]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = e.touches[0].clientY - dragStartY.current;
      if (Math.abs(deltaY) > 4) hasMoved.current = true;
      setPosY(clampY(dragStartPosY.current + deltaY));
      if (Math.abs(deltaY) > 4) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [clampY]);

  const handleClick = useCallback(() => {
    if (!hasMoved.current) {
      onClick();
    }
  }, [onClick]);

  if (posY === null) return null;

  return (
    <button
      ref={buttonRef}
      id="btn-chatbot"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      className={`
        fixed left-0 z-10 bg-blue-600 text-white py-3 px-1.5 flex flex-col items-center gap-1.5 transition-all duration-300 ease-in-out
        ${isChatbotOpen ? 'opacity-0 pointer-events-none' : 'opacity-90 hover:opacity-100'}
        ${isDragging ? 'scale-110 shadow-xl' : 'shadow-lg hover:scale-105'}
        w-9 sm:w-9 rounded-r-xl cursor-grab active:cursor-grabbing select-none
      `}
      style={{
        top: `${posY}px`,
        transform: 'translateY(-50%)',
        touchAction: isDragging ? 'none' : 'pan-y',
      }}
      aria-label="Abrir asistente (arrastrar para mover)"
    >
      <Icon name="bot" className="w-5 h-5 flex-shrink-0 pointer-events-none" />
      <span className="hidden sm:inline font-semibold text-[10px] tracking-wider pointer-events-none" style={{ writingMode: 'vertical-rl' }}>
        ASISTENTE
      </span>
    </button>
  );
};

export default DraggableChatButton;
