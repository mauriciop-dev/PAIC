import React, { useState, useEffect } from "react";
import { Icon, Button, Input } from "@paic/ui";
import { apiService } from "../services/apiService";
import { InternalStaff } from "../types";

interface InternalStaffWithPin extends InternalStaff {
  hashed_pin?: string;
  pin_expires_at?: string;
}

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (staff: InternalStaff) => void;
  conjuntoId: string;
  title?: string;
  actionDescription?: string;
}

const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  conjuntoId,
  title = "Confirmar Acción",
  actionDescription = "Ingrese su PIN para confirmar",
}) => {
  const [staffList, setStaffList] = useState<InternalStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Load staff list when modal opens
  useEffect(() => {
    if (isOpen) {
      loadStaff();
    }
  }, [isOpen, conjuntoId]);

  const loadStaff = async () => {
    try {
      const staff = await apiService.fetchInternalStaff(conjuntoId);
      setStaffList(staff);
      if (staff.length > 0 && !selectedStaffId) {
        setSelectedStaffId(staff[0].name); // Use name as ID since composite PK
      }
    } catch (err) {
      console.error("Error loading staff:", err);
      setError("Error al cargar personal");
    }
  };

  const handleVerify = async () => {
    if (!selectedStaffId || !pin) {
      setError("Seleccione un guardia e ingrese su PIN");
      return;
    }

    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      setError("El PIN debe ser de 4 a 6 dígitos");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Find the selected staff
      const staff = staffList.find(s => s.name === selectedStaffId) as InternalStaffWithPin | undefined;
      if (!staff) {
        setError("Guardia no encontrado");
        return;
      }

      // Verify PIN - we need to call a new API endpoint or RPC
      // For now, we'll use a simple hash comparison
      // In production, this should use a proper hash verification
      const isValid = await verifyPin(staff, pin);
      
      if (isValid) {
        onVerify(staff);
        onClose();
      } else {
        setError("PIN incorrecto");
      }
    } catch (err) {
      setError("Error al verificar PIN");
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyPin = async (staff: InternalStaffWithPin, pin: string): Promise<boolean> => {
    // In a real implementation, this would call a secure RPC function
    // that compares the hashed PIN without exposing it
    // For now, we'll use a simple client-side check for demo purposes
    // TODO: Implement proper server-side PIN verification via RPC
    
    // If no PIN is set, any PIN works (first time setup)
    if (!staff.hashed_pin) {
      return true;
    }
    
    // Simple hash for demo - replace with proper bcrypt/scrypt in production
    const hashedInput = await hashPin(pin);
    return hashedInput === staff.hashed_pin;
  };

  const hashPin = async (pin: string): Promise<string> => {
    // Simple hash for demo - in production use proper bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + "PAIC_SALT_" + pin.length);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isVerifying}
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">{actionDescription}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Staff Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guardia Responsable
            </label>
            <select
              value={selectedStaffId || ""}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              disabled={isVerifying}
            >
              <option value="">Seleccionar guardia...</option>
              {staffList.map((staff) => (
                <option key={staff.name} value={staff.name}>
                  {staff.name} ({staff.position || "Sin cargo"})
                </option>
              ))}
            </select>
          </div>

          {/* PIN Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIN (4-6 dígitos)
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono"
              disabled={isVerifying}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              {pin.length}/6 dígitos
            </p>
          </div>

          {/* Quick PIN Pad for Mobile/Kiosk */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === "⌫") {
                    setPin(pin.slice(0, -1));
                  } else if (key && pin.length < 6) {
                    setPin(pin + key);
                  }
                }}
                disabled={isVerifying}
                className="py-3 bg-gray-50 border border-gray-200 rounded-lg text-xl font-medium text-gray-700 active:bg-gray-100"
              >
                {key}
              </button>
            ))}
          </div>

          <Button
            onClick={handleVerify}
            disabled={isVerifying || !selectedStaffId || pin.length < 4}
            className="w-full"
            variant="primary"
            size="lg"
          >
            {isVerifying ? "Verificando..." : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PinVerificationModal;
