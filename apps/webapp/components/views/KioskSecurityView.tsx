import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@paic/ui";
import { apiService } from "../../services/apiService";
import {
  EstacionSession,
  VigilanteSession,
  VisitorLog,
  PackageLog,
  Resident,
} from "../../types";
import ShiftModal from "../ShiftModal";

interface KioskSecurityViewProps {
  onStationDisconnect?: () => void;
}

type KioskTab = "Visitantes" | "Paquetes";

const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDate = (raw: string | null | undefined): string => {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return raw;
  }
};

const KioskSecurityView: React.FC<KioskSecurityViewProps> = ({ onStationDisconnect }) => {
  const [stationSession, setStationSession] = useState<EstacionSession | null>(null);
  const [activeShift, setActiveShift] = useState<VigilanteSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Shift Modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isEndingShift, setIsEndingShift] = useState(false);

  // Operational state
  const [activeTab, setActiveTab] = useState<KioskTab>("Visitantes");
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [packageLogs, setPackageLogs] = useState<PackageLog[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Forms - Visitor
  const [visitorName, setVisitorName] = useState("");
  const [visitorApartment, setVisitorApartment] = useState("");
  const [visitorDate, setVisitorDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmittingVisitor, setIsSubmittingVisitor] = useState(false);
  const [visitorFeedback, setVisitorFeedback] = useState<string | null>(null);

  // Forms - Package
  const [pkgApartment, setPkgApartment] = useState("");
  const [pkgCourier, setPkgCourier] = useState("");
  const [pkgTracking, setPkgTracking] = useState("");
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);
  const [packageFeedback, setPackageFeedback] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Initial Station Validation
  useEffect(() => {
    const session = apiService.getStationSession();
    if (!session) {
      window.location.href = "/login?tab=porteria";
      return;
    }
    setStationSession(session);

    // Check active shift for this station
    apiService.getActiveShiftForStation(session.id).then((shift) => {
      setActiveShift(shift);
      setIsCheckingSession(false);
    });
  }, []);

  // 2. Fetch Data when Shift is active
  const fetchOperationalData = useCallback(async () => {
    if (!stationSession) return;
    setIsLoadingData(true);
    try {
      // 1. Intentar cargar datos consolidados mediante RPC de portería
      let visitors: VisitorLog[] = [];
      let packages: PackageLog[] = [];
      let resList: Resident[] = [];

      try {
        const guardData = await apiService.fetchGuardData(stationSession.conjunto_id);
        visitors = guardData.visitorLogs || [];
        packages = guardData.packageLogs || [];
        resList = guardData.residents || [];
      } catch (e) {
        console.warn("RPC fetchGuardData fallback:", e);
      }

      // 2. Fallback a consultas directas si alguna lista vino vacía
      if (visitors.length === 0 && packages.length === 0 && resList.length === 0) {
        const [v, p, r] = await Promise.all([
          apiService.fetchVisitorLogs(stationSession.conjunto_id).catch(() => []),
          apiService.fetchPackageLogs(stationSession.conjunto_id).catch(() => []),
          apiService.fetchResidents(stationSession.conjunto_id).catch(() => []),
        ]);
        visitors = v;
        packages = p;
        resList = r;
      }

      setVisitorLogs(visitors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.id || 0) - (a.id || 0)));
      setPackageLogs(packages);
      setResidents(resList);

      if (resList.length > 0) {
        setVisitorApartment((prev) => prev || resList[0].apartment);
        setPkgApartment((prev) => prev || resList[0].apartment);
      }
    } catch (err) {
      console.error("Error loading kiosk operational data:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, [stationSession]);

  useEffect(() => {
    if (activeShift && stationSession) {
      fetchOperationalData();
    }
  }, [activeShift, stationSession, fetchOperationalData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOperationalData();
    setIsRefreshing(false);
  };

  // Handlers for Shift Start / End
  const handleShiftStarted = (shift: VigilanteSession) => {
    setActiveShift(shift);
    setNotification({
      type: "success",
      text: `¡Turno iniciado con éxito! Bienvenido(a), ${shift.vigilante_nombre}.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    const confirmClose = window.confirm(
      `¿Está seguro de entregar y finalizar el turno de ${activeShift.vigilante_nombre}?`
    );
    if (!confirmClose) return;

    setIsEndingShift(true);
    try {
      await apiService.endGuardShift(activeShift.turno_id);
      setActiveShift(null);
      setNotification({
        type: "success",
        text: "Turno entregado y finalizado correctamente. Estación lista para el siguiente turno.",
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Error al finalizar el turno.",
      });
    } finally {
      setIsEndingShift(false);
    }
  };

  const handleDisconnectStation = () => {
    const confirmDisc = window.confirm("¿Desea desconectar esta estación de este equipo?");
    if (!confirmDisc) return;
    apiService.clearStationSession();
    if (onStationDisconnect) {
      onStationDisconnect();
    } else {
      window.location.href = "/login?tab=porteria";
    }
  };

  // --- Operational Handlers (NO PIN REQUIRED IN ACTIVE SHIFT) ---
  const handleAuthorizeVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationSession || !visitorName.trim() || !visitorApartment.trim()) return;
    setIsSubmittingVisitor(true);
    try {
      const payload = {
        visitorName: visitorName.trim(),
        apartment: visitorApartment.trim(),
        date: visitorDate,
        status: "Autorizado" as const,
      };

      try {
        await apiService.guardAddVisitorLog(stationSession.conjunto_id, payload);
      } catch (rpcErr) {
        console.warn("Fallback to standard addVisitorLog:", rpcErr);
        await apiService.addVisitorLog(stationSession.conjunto_id, payload);
      }

      setVisitorName("");
      setVisitorFeedback("✅ Visitante registrado y autorizado en bitácora.");
      setTimeout(() => setVisitorFeedback(null), 3000);
      await fetchOperationalData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Error al autorizar visitante." });
    } finally {
      setIsSubmittingVisitor(false);
    }
  };

  const handleRegisterEntry = async (logId: number) => {
    if (!stationSession) return;
    const now = formatTime(new Date());
    try {
      try {
        await apiService.guardUpdateVisitorLog(logId, { status: "Ingresó", entryTime: now });
      } catch (rpcErr) {
        console.warn("Fallback to standard updateVisitorLog:", rpcErr);
        await apiService.updateVisitorLog(stationSession.conjunto_id, logId, {
          status: "Ingresó",
          entryTime: now,
        });
      }
      setVisitorLogs((prev) =>
        prev.map((log) => (log.id === logId ? { ...log, status: "Ingresó", entryTime: now } : log))
      );
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Error al registrar ingreso." });
    }
  };

  const handleRegisterExit = async (logId: number) => {
    if (!stationSession) return;
    const now = formatTime(new Date());
    try {
      try {
        await apiService.guardUpdateVisitorLog(logId, { status: "Salió", exitTime: now });
      } catch (rpcErr) {
        console.warn("Fallback to standard updateVisitorLog:", rpcErr);
        await apiService.updateVisitorLog(stationSession.conjunto_id, logId, {
          status: "Salió",
          exitTime: now,
        });
      }
      setVisitorLogs((prev) =>
        prev.map((log) => (log.id === logId ? { ...log, status: "Salió", exitTime: now } : log))
      );
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Error al registrar salida." });
    }
  };

  const handleRegisterPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationSession || !pkgApartment.trim() || !pkgCourier.trim()) return;
    setIsSubmittingPackage(true);
    try {
      const payload = {
        apartment: pkgApartment.trim(),
        courier: pkgCourier.trim(),
        trackingNumber: pkgTracking.trim() || undefined,
      };

      try {
        await apiService.guardAddPackageLog(stationSession.conjunto_id, payload);
      } catch (rpcErr) {
        console.warn("Fallback to standard addPackageLog:", rpcErr);
        await apiService.addPackageLog(stationSession.conjunto_id, payload);
      }

      setPkgCourier("");
      setPkgTracking("");
      setPackageFeedback("✅ Paquete recibido y registrado en bitácora.");
      setTimeout(() => setPackageFeedback(null), 3000);
      await fetchOperationalData();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Error al registrar paquete." });
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  const handleMarkDelivered = async (packageId: number) => {
    if (!stationSession) return;
    try {
      try {
        await apiService.guardUpdatePackageLogStatus(packageId, "Entregado");
      } catch (rpcErr) {
        console.warn("Fallback to standard updatePackageLogStatus:", rpcErr);
        await apiService.updatePackageLogStatus(stationSession.conjunto_id, packageId, "Entregado");
      }
      setPackageLogs((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, status: "Entregado" } : p))
      );
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Error al marcar paquete como entregado." });
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Icon name="refresh-cw" className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-slate-300">Verificando estación de seguridad...</p>
        </div>
      </div>
    );
  }

  if (!stationSession) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Kiosk Bar */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 shadow-md flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Icon name="shield" className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {stationSession.nombre}
              </h1>
              <span className="px-2 py-0.5 bg-slate-800 text-blue-400 font-mono text-xs rounded-md border border-slate-700">
                {stationSession.codigo_estacion}
              </span>
            </div>
            <p className="text-xs text-slate-400">{stationSession.conjunto_nombre}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeShift ? (
            <div className="flex items-center gap-3">
              {/* Active Guard Badge */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-200 leading-tight">
                    {activeShift.vigilante_nombre}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Turno Activo {activeShift.es_emergencia && "• Novedad"}
                  </p>
                </div>
              </div>

              {/* End Shift Button */}
              <button
                onClick={handleEndShift}
                disabled={isEndingShift}
                className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-rose-600/20 active:scale-95"
              >
                <Icon name="log-out" className="w-4 h-4" />
                <span>{isEndingShift ? "Cerrando..." : "Entregar / Cerrar Turno"}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleDisconnectStation}
              className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Desconectar estación"
            >
              Desconectar
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div
          className={`px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm animate-fadeIn ${
            notification.type === "error"
              ? "bg-rose-500 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2 max-w-screen-2xl mx-auto w-full">
            <Icon
              name={notification.type === "error" ? "alert-triangle" : "check"}
              className="w-4 h-4 flex-shrink-0"
            />
            <span>{notification.text}</span>
          </div>
        </div>
      )}

      {/* Body */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {!activeShift ? (
          /* ========================================================================= */
          /* ESTADO SIN TURNO ACTIVO: PANTALLA LIMPIA CON BOTÓN "INICIAR TURNO"        */
          /* ========================================================================= */
          <div className="min-h-[75vh] flex items-center justify-center">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-12 text-center max-w-lg w-full transform transition-all">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-inner">
                <Icon name="user-check" className="w-10 h-10" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                Esperando Inicio de Turno
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                La estación <strong className="text-slate-700">{stationSession.nombre}</strong> se encuentra conectada y lista para recibir al personal de seguridad.
              </p>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(true)}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-2xl font-bold text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all hover:shadow-2xl hover:shadow-blue-600/40"
                >
                  <Icon name="log-in" className="w-5 h-5" />
                  <span>Iniciar Turno de Vigilancia</span>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Punto de Control: {stationSession.codigo_estacion}</span>
                <button
                  onClick={handleDisconnectStation}
                  className="text-slate-400 hover:text-rose-600 font-medium transition-colors"
                >
                  Cambiar de estación
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ESTADO CON TURNO ACTIVO: BITÁCORA OPERATIVA (SIN PIN POR ACCIÓN)          */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Nav Tabs */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex gap-2">
                {(["Visitantes", "Paquetes"] as KioskTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                      activeTab === tab
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon
                      name={tab === "Visitantes" ? "user" : "package"}
                      className="w-4 h-4"
                    />
                    <span>{tab}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleRefresh}
                className="p-2.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                title="Actualizar datos"
              >
                <Icon
                  name="refresh-cw"
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {isLoadingData ? (
              <div className="text-center py-16 text-slate-400">
                <Icon name="refresh-cw" className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Cargando bitácora de portería...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Column */}
                <div className="lg:col-span-1">
                  {activeTab === "Visitantes" ? (
                    /* FORMULARIO VISITANTES */
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Icon name="user-check" className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">
                            Autorizar Ingreso
                          </h3>
                          <p className="text-[11px] text-slate-400">Registro en bitácora</p>
                        </div>
                      </div>

                      <form onSubmit={handleAuthorizeVisitor} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Nombre del Visitante
                          </label>
                          <input
                            type="text"
                            value={visitorName}
                            onChange={(e) => setVisitorName(e.target.value)}
                            placeholder="Nombre completo"
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Apartamento de Destino
                          </label>
                          {residents.length > 0 ? (
                            <select
                              value={visitorApartment}
                              onChange={(e) => setVisitorApartment(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              required
                            >
                              <option value="">Seleccionar apartamento...</option>
                              {residents.map((r) => (
                                <option key={r.apartment} value={r.apartment}>
                                  Apto {r.apartment} - {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={visitorApartment}
                              onChange={(e) => setVisitorApartment(e.target.value)}
                              placeholder="Ej. 101, Torre 1 - 202"
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              required
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Fecha de Visita
                          </label>
                          <input
                            type="date"
                            value={visitorDate}
                            onChange={(e) => setVisitorDate(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingVisitor}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-98"
                        >
                          {isSubmittingVisitor ? "Guardando..." : "Autorizar Visitante"}
                        </button>

                        {visitorFeedback && (
                          <p className="text-xs text-emerald-600 font-semibold text-center mt-2">
                            {visitorFeedback}
                          </p>
                        )}
                      </form>
                    </div>
                  ) : (
                    /* FORMULARIO PAQUETES */
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Icon name="package" className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">
                            Recepción de Correspondencia
                          </h3>
                          <p className="text-[11px] text-slate-400">Registro de entrega</p>
                        </div>
                      </div>

                      <form onSubmit={handleRegisterPackage} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Apartamento
                          </label>
                          {residents.length > 0 ? (
                            <select
                              value={pkgApartment}
                              onChange={(e) => setPkgApartment(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              required
                            >
                              <option value="">Seleccionar apartamento...</option>
                              {residents.map((r) => (
                                <option key={r.apartment} value={r.apartment}>
                                  Apto {r.apartment} - {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={pkgApartment}
                              onChange={(e) => setPkgApartment(e.target.value)}
                              placeholder="Ej. 101, Torre 1 - 202"
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              required
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Empresa o Mensajería
                          </label>
                          <input
                            type="text"
                            value={pkgCourier}
                            onChange={(e) => setPkgCourier(e.target.value)}
                            placeholder="Ej. Servientrega, Envia, Amazon, MercadoLibre"
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Número de Guía (Opcional)
                          </label>
                          <input
                            type="text"
                            value={pkgTracking}
                            onChange={(e) => setPkgTracking(e.target.value)}
                            placeholder="Ej. 1293849182"
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingPackage}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-98"
                        >
                          {isSubmittingPackage ? "Guardando..." : "Registrar Paquete"}
                        </button>

                        {packageFeedback && (
                          <p className="text-xs text-emerald-600 font-semibold text-center mt-2">
                            {packageFeedback}
                          </p>
                        )}
                      </form>
                    </div>
                  )}
                </div>

                {/* Table / List Column */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-sm">
                        {activeTab === "Visitantes"
                          ? "Control de Ingresos y Salidas del Día"
                          : "Correspondencia y Paquetes en Recepción"}
                      </h3>
                      <span className="text-xs font-semibold text-slate-400">
                        {activeTab === "Visitantes"
                          ? `${visitorLogs.length} registros`
                          : `${packageLogs.length} paquetes`}
                      </span>
                    </div>

                    {activeTab === "Visitantes" ? (
                      /* LISTA VISITANTES */
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-600">
                          <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="px-4 py-3">Fecha</th>
                              <th className="px-4 py-3">Visitante</th>
                              <th className="px-4 py-3">Apto</th>
                              <th className="px-4 py-3">Estado</th>
                              <th className="px-4 py-3">Hora Ingreso</th>
                              <th className="px-4 py-3">Hora Salida</th>
                              <th className="px-4 py-3 text-center">Acción Rápida</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {visitorLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(log.date)}</td>
                                <td className="px-4 py-3 font-semibold text-slate-900">{log.visitorName}</td>
                                <td className="px-4 py-3 font-medium">Apto {log.apartment}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      log.status === "Autorizado"
                                        ? "bg-blue-100 text-blue-800"
                                        : log.status === "Ingresó"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-700">{log.entryTime || "—"}</td>
                                <td className="px-4 py-3 text-slate-700">{log.exitTime || "—"}</td>
                                <td className="px-4 py-3 text-center">
                                  {log.status === "Autorizado" && (
                                    <button
                                      onClick={() => handleRegisterEntry(log.id)}
                                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[11px] transition-colors"
                                    >
                                      Ingresó
                                    </button>
                                  )}
                                  {log.status === "Ingresó" && (
                                    <button
                                      onClick={() => handleRegisterExit(log.id)}
                                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-[11px] transition-colors"
                                    >
                                      Salió
                                    </button>
                                  )}
                                  {log.status === "Salió" && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Completado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {visitorLogs.length === 0 && (
                              <tr>
                                <td colSpan={7} className="text-center py-10 text-slate-400">
                                  No hay visitantes registrados en la bitácora
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* LISTA PAQUETES */
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-600">
                          <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="px-4 py-3">Fecha</th>
                              <th className="px-4 py-3">Apto</th>
                              <th className="px-4 py-3">Empresa</th>
                              <th className="px-4 py-3">Guía</th>
                              <th className="px-4 py-3">Estado</th>
                              <th className="px-4 py-3 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {packageLogs.map((pkg) => (
                              <tr key={pkg.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(pkg.receivedDate)}</td>
                                <td className="px-4 py-3 font-semibold text-slate-900">Apto {pkg.apartment}</td>
                                <td className="px-4 py-3">{pkg.courier}</td>
                                <td className="px-4 py-3 font-mono text-slate-500">{pkg.trackingNumber || "—"}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      pkg.status === "En recepción"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {pkg.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {pkg.status === "En recepción" ? (
                                    <button
                                      onClick={() => handleMarkDelivered(pkg.id)}
                                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-[11px] transition-colors"
                                    >
                                      Entregar
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Entregado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {packageLogs.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-400">
                                  No hay paquetes registrados
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Shift Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onShiftStarted={handleShiftStarted}
        estacionId={stationSession.id}
        estacionNombre={stationSession.nombre}
        conjuntoId={stationSession.conjunto_id}
      />
    </div>
  );
};

export default KioskSecurityView;
