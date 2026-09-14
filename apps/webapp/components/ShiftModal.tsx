import React, { useState, useEffect } from "react";
import { Icon } from "./ui/Icon";
import { apiService } from "../services/apiService";
import { VigilanteSession } from "../types";

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftStarted: (shift: VigilanteSession) => void;
  estacionId: string;
  estacionNombre?: string;
  conjuntoId: string;
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onShiftStarted,
  estacionId,
  estacionNombre = "Punto de Acceso",
  conjuntoId,
}) => {
  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Emergency replacement state
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [emergencyGuardName, setEmergencyGuardName] = useState("");
  const [emergencyNovelty, setEmergencyNovelty] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCedula("");
      setPin("");
      setError(null);
      setIsLoading(false);
      setIsEmergencyMode(false);
      setEmergencyGuardName("");
      setEmergencyNovelty("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePinSubmit = async (pinValue: string) => {
    if (pinValue === "0000" || pinValue === "000000") {
      setIsEmergencyMode(true);
      setError(null);
      return;
    }

    if (!cedula.trim()) {
      setError("Por favor, ingrese el número de cédula del vigilante.");
      return;
    }

    if (pinValue.length < 6) {
      setError("El PIN de seguridad debe ser de 6 dígitos.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const shiftSession = await apiService.startGuardShift({
        estacionId,
        cedula: cedula.trim(),
        pin: pinValue.trim(),
        esEmergencia: false,
      });

      onShiftStarted(shiftSession);
      onClose();
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas o vigilante inactivo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmEmergency = async () => {
    if (!emergencyGuardName.trim()) {
      setError("Ingrese el nombre completo del vigilante de reemplazo.");
      return;
    }
    if (!emergencyNovelty.trim()) {
      setError("Ingrese la novedad o motivo del reemplazo de emergencia.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const shiftSession = await apiService.startGuardShift({
        estacionId,
        esEmergencia: true,
        nombreReemplazo: emergencyGuardName.trim(),
        motivoReemplazo: emergencyNovelty.trim(),
      });

      onShiftStarted(shiftSession);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al registrar el turno de emergencia.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPadClick = (val: string) => {
    if (val === "⌫") {
      setPin((prev) => prev.slice(0, -1));
    } else if (val === "clear") {
      setPin("");
    } else if (pin.length < 6) {
      const nextPin = pin + val;
      setPin(nextPin);
      if (nextPin.length === 6) {
        handlePinSubmit(nextPin);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 transform transition-all">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Icon name="shield" className="w-6 h-6 text-blue-100" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Inicio de Turno</h3>
              <p className="text-xs text-blue-100 mt-0.5">{estacionNombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <Icon name="alert-triangle" className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isEmergencyMode ? (
            <div>
              {/* Cédula Input */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Cédula de Ciudadanía
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
                    placeholder="Número de documento"
                    className="w-full p-3 pl-10 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold tracking-wider text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    autoFocus
                  />
                  <Icon
                    name="user"
                    className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  />
                </div>
              </div>

              {/* PIN Display */}
              <div className="mb-2 text-center">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  PIN de Seguridad (6 Dígitos)
                </label>
                <div className="flex justify-center gap-2 sm:gap-2.5 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-10 h-12 sm:w-11 sm:h-13 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                        pin.length > idx
                          ? "border-blue-600 bg-blue-50 text-blue-600 scale-105 shadow-sm"
                          : "border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                    >
                      {pin.length > idx ? "•" : ""}
                    </div>
                  ))}
                </div>
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "⌫"].map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        if (key === "clear") handleKeyPadClick("clear");
                        else handleKeyPadClick(key);
                      }}
                      className={`py-3 rounded-xl font-bold text-base transition-all active:scale-95 ${
                        key === "clear"
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs"
                          : key === "⌫"
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200 text-base"
                          : "bg-gray-50 text-gray-800 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {key === "clear" ? "Borrar" : key}
                    </button>
                  )
                )}
              </div>

              {/* Emergency Trigger */}
              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsEmergencyMode(true);
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 hover:bg-amber-100 font-semibold transition-colors"
                >
                  <Icon name="alert-triangle" className="w-3.5 h-3.5 text-amber-600" />
                  <span>¿Vigilante de reemplazo o emergencia? (PIN 0000)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Emergency Mode Form */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-start gap-2.5">
                <Icon name="alert-triangle" className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                <p>
                  Modo de Reemplazo de Emergencia activado. Ingrese los datos del personal de apoyo para registrar la novedad en la bitácora legal.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nombre Completo del Vigilante de Reemplazo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emergencyGuardName}
                  onChange={(e) => setEmergencyGuardName(e.target.value)}
                  placeholder="Ej. Pedro Pérez"
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Motivo o Novedad de la Asignación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={emergencyNovelty}
                  onChange={(e) => setEmergencyNovelty(e.target.value)}
                  placeholder="Ej. Reemplazo por incapacidad médica del vigilante de turno principal"
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmergencyMode(false)}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
                >
                  Volver al PIN
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEmergency}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Icon name="check" className="w-4 h-4" />
                  {isLoading ? "Iniciando..." : "Confirmar Turno"}
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
