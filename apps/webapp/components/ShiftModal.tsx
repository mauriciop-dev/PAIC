import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { apiService } from "../services/apiService";
import { PlatformUser, ActiveShift } from "../types";

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartShift: (shift: ActiveShift) => void;
  conjuntoId: string;
  accessPointName?: string;
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onStartShift,
  conjuntoId,
  accessPointName = "Portería Principal",
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [emergencyGuardName, setEmergencyGuardName] = useState("");
  const [emergencyNovelty, setEmergencyNovelty] = useState("");
  const [usersList, setUsersList] = useState<PlatformUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError(null);
      setIsEmergencyMode(false);
      setEmergencyGuardName("");
      setEmergencyNovelty("");
      loadUsers();
    }
  }, [isOpen, conjuntoId]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await apiService.fetchUsers(conjuntoId);
      setUsersList(users);
    } catch (err) {
      console.error("Error loading users for shift:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  if (!isOpen) return null;

  const handlePinSubmit = async (pinValue: string) => {
    if (pinValue === "0000") {
      setIsEmergencyMode(true);
      setError(null);
      return;
    }

    if (pinValue.length < 4) {
      setError("El PIN debe ser de 4 dígitos.");
      return;
    }

    // Check if PIN matches any user in the platform
    const matchedUser = usersList.find(u => u.pin === pinValue);
    
    if (matchedUser) {
      const activeShift: ActiveShift = {
        guardName: matchedUser.name,
        isEmergency: false,
        startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      onStartShift(activeShift);
      onClose();
    } else {
      // If guard user exists but has no PIN yet, allow initial shift start
      const guardUser = usersList.find(u => u.role === "Guard" || u.role === "Punto de Acceso");
      if (guardUser && (!guardUser.pin || guardUser.pin === pinValue)) {
        const activeShift: ActiveShift = {
          guardName: guardUser.name,
          isEmergency: false,
          startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        onStartShift(activeShift);
        onClose();
        return;
      }
      setError("PIN no reconocido. Si es un vigilante de reemplazo, digite el PIN 0000.");
    }
  };

  const handleConfirmEmergency = () => {
    if (!emergencyGuardName.trim()) {
      setError("Ingrese el nombre completo del vigilante.");
      return;
    }
    if (!emergencyNovelty.trim()) {
      setError("Ingrese la novedad o motivo del reemplazo.");
      return;
    }

    const activeShift: ActiveShift = {
      guardName: `${emergencyGuardName.trim()} (Reemplazo)`,
      isEmergency: true,
      noveltyNote: emergencyNovelty.trim(),
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onStartShift(activeShift);
    onClose();
  };

  const handleKeyPadClick = (val: string) => {
    if (val === "⌫") {
      setPin(prev => prev.slice(0, -1));
    } else if (val === "clear") {
      setPin("");
    } else if (pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handlePinSubmit(nextPin);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Inicio de Turno</h3>
            <p className="text-xs text-blue-100 mt-1">{accessPointName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200">
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <Icon name="alert-triangle" className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isEmergencyMode ? (
            <div>
              <p className="text-sm text-gray-600 text-center mb-4">
                Digite su PIN de 4 dígitos para iniciar turno
              </p>

              {/* PIN Display */}
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${
                      pin.length > idx
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : "border-gray-300 bg-gray-50 text-gray-400"
                    }`}
                  >
                    {pin.length > idx ? "•" : ""}
                  </div>
                ))}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "⌫"].map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === "clear") handleKeyPadClick("clear");
                      else handleKeyPadClick(key);
                    }}
                    className={`py-3 rounded-xl font-semibold text-lg transition-colors ${
                      key === "clear"
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs"
                        : key === "⌫"
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-gray-50 text-gray-800 border border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                    }`}
                  >
                    {key === "clear" ? "Borrar" : key}
                  </button>
                ))}
              </div>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => handlePinSubmit("0000")}
                  className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 hover:bg-amber-100 font-medium"
                >
                  🚨 ¿Vigilante de reemplazo o emergencia? Usar PIN 0000
                </button>
              </div>
            </div>
          ) : (
            /* Emergency Mode Form */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold flex items-center gap-2">
                <Icon name="alert-triangle" className="w-5 h-5 flex-shrink-0 text-amber-600" />
                <span>PIN de Emergencia 0000 detectado. Registre la novedad para iniciar turno.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre Completo del Vigilante <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emergencyGuardName}
                  onChange={e => setEmergencyGuardName(e.target.value)}
                  placeholder="Ej. Pedro Pérez"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Motivo / Novedad del Reemplazo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={emergencyNovelty}
                  onChange={e => setEmergencyNovelty(e.target.value)}
                  placeholder="Ej. Reemplazo de emergencia por permiso personal de Carlos"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm h-20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmergencyMode(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200"
                >
                  Volver al PIN
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEmergency}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700"
                >
                  Confirmar Novedad
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftModal;
