import React, { useState, useEffect } from "react";
import { apiService } from "../../services/apiService";
import { VisitorLog, PackageLog, Resident, UserProfile, AccessPoint, InternalStaff, ActiveShift } from "../../types";
import { Icon } from "@paic/ui";
import PinVerificationModal from "../../components/PinVerificationModal";
import ShiftModal from "../../components/ShiftModal";

type SeguridadTab = "Visitantes" | "Paquetes";

interface SeguridadViewProps {
  userProfile: UserProfile;
  selectedAccessPointId: number | null;
}

const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const SeguridadView: React.FC<SeguridadViewProps> = ({ userProfile, selectedAccessPointId }) => {
  const [activeTab, setActiveTab] = useState<SeguridadTab>("Visitantes");
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [packageLogs, setPackageLogs] = useState<PackageLog[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingLogId, setUpdatingLogId] = useState<number | null>(null);

  const [pkgApartment, setPkgApartment] = useState("");
  const [pkgCourier, setPkgCourier] = useState("");
  const [pkgTracking, setPkgTracking] = useState("");
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);
  const [packageFeedback, setPackageFeedback] = useState<string | null>(null);

  const [visitorName, setVisitorName] = useState("");
  const [visitorApartment, setVisitorApartment] = useState("");
  const [visitorDate, setVisitorDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmittingVisitor, setIsSubmittingVisitor] = useState(false);
  const [visitorFeedback, setVisitorFeedback] = useState<string | null>(null);

  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "authorize_visitor" | "register_package" | "register_entry" | "register_exit" | "mark_delivered";
    data: any;
  } | null>(null);

  // Load active shift from localStorage
  useEffect(() => {
    if (userProfile.conjuntoId) {
      const savedShift = localStorage.getItem(`paic_active_shift_${userProfile.conjuntoId}`);
      if (savedShift) {
        try {
          setActiveShift(JSON.parse(savedShift));
        } catch (e) {
          console.error("Failed to parse saved shift:", e);
        }
      }
    }
  }, [userProfile.conjuntoId]);

  const handleStartShift = (shift: ActiveShift) => {
    setActiveShift(shift);
    if (userProfile.conjuntoId) {
      localStorage.setItem(`paic_active_shift_${userProfile.conjuntoId}`, JSON.stringify(shift));
    }
    setActionFeedback({
      type: "success",
      text: ` Turno iniciado exitosamente para ${shift.guardName}.`,
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const fetchData = async () => {
    if (!userProfile.conjuntoId) return;
    setIsLoading(true);
    try {
      const [visitors, packages, res, points] = await Promise.all([
        apiService.fetchVisitorLogs(userProfile.conjuntoId),
        apiService.fetchPackageLogs(userProfile.conjuntoId),
        apiService.fetchResidents(userProfile.conjuntoId),
        apiService.fetchAccessPoints(userProfile.conjuntoId),
      ]);
      setVisitorLogs(visitors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id));
      setPackageLogs(packages);
      setResidents(res);
      setAccessPoints(points);
      if (res.length > 0) {
        if (!pkgApartment) setPkgApartment(res[0].apartment);
        if (!visitorApartment) setVisitorApartment(res[0].apartment);
      }
    } catch (error) {
      console.error("Failed to fetch security data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile.conjuntoId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const getStatusChipStyle = (status: VisitorLog["status"] | PackageLog["status"]) => {
    switch (status) {
      case "Autorizado":
        return "bg-blue-100 text-blue-800";
      case "Ingresó":
        return "bg-yellow-100 text-yellow-800";
      case "Salió":
        return "bg-gray-100 text-gray-800";
      case "En recepción":
        return "bg-orange-100 text-orange-800";
      case "Entregado":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openPinModal = (
    type: "authorize_visitor" | "register_package" | "register_entry" | "register_exit" | "mark_delivered",
    data: any
  ) => {
    setPendingAction({ type, data });
    setPinModalOpen(true);
  };

  const closePinModal = () => {
    setPinModalOpen(false);
    setPendingAction(null);
  };

  const handlePinVerified = async (staff: InternalStaff) => {
    if (!pendingAction || !userProfile.conjuntoId) return;

    const { type, data } = pendingAction;
    setActionFeedback(null);

    try {
      switch (type) {
        case "authorize_visitor": {
          await apiService.addVisitorLog(userProfile.conjuntoId, {
            visitorName: data.visitorName,
            apartment: data.visitorApartment,
            date: data.visitorDate,
            status: "Autorizado",
          });
          setVisitorName("");
          setVisitorFeedback("✅ Visitante autorizado exitosamente!");
          setTimeout(() => setVisitorFeedback(null), 3000);
          break;
        }
        case "register_package": {
          await apiService.addPackageLog(userProfile.conjuntoId, {
            apartment: data.pkgApartment,
            courier: data.pkgCourier,
            trackingNumber: data.pkgTracking || undefined,
          });
          setPkgCourier("");
          setPkgTracking("");
          setPackageFeedback("✅ Paquete registrado exitosamente!");
          setTimeout(() => setPackageFeedback(null), 3000);
          break;
        }
        case "register_entry": {
          const now = formatTime(new Date());
          await apiService.updateVisitorLog(userProfile.conjuntoId, data.logId, {
            status: "Ingresó",
            entryTime: now,
          });
          setVisitorLogs((prev) =>
            prev.map((log) =>
              log.id === data.logId ? { ...log, status: "Ingresó", entryTime: now } : log
            )
          );
          break;
        }
        case "register_exit": {
          const now = formatTime(new Date());
          await apiService.updateVisitorLog(userProfile.conjuntoId, data.logId, {
            status: "Salió",
            exitTime: now,
          });
          setVisitorLogs((prev) =>
            prev.map((log) =>
              log.id === data.logId ? { ...log, status: "Salió", exitTime: now } : log
            )
          );
          break;
        }
        case "mark_delivered": {
          await apiService.updatePackageLogStatus(userProfile.conjuntoId, data.packageId, "Entregado");
          break;
        }
      }

      // Log to operational audit
      await logOperationalAction(type, data, staff);
    } catch (error) {
      console.error(`Error executing ${type}:`, error);
      setActionFeedback({ type: "error", text: `Error: ${error instanceof Error ? error.message : "Error desconocido"}` });
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      closePinModal();
      if (type === "authorize_visitor" || type === "register_package" || type === "mark_delivered") {
        fetchData();
      }
    }
  };

  const logOperationalAction = async (
    type: string,
    data: any,
    staff: InternalStaff
  ) => {
    if (!userProfile.conjuntoId || !selectedAccessPointId) return;

    try {
      const actionMap: Record<string, string> = {
        authorize_visitor: "autorizar_visitante",
        register_package: "registrar_paquete",
        register_entry: "registrar_ingreso",
        register_exit: "registrar_salida",
        mark_delivered: "marcar_entregado",
      };

      await apiService.addVisitorLog(userProfile.conjuntoId, {
        visitorName: `AUDIT: ${actionMap[type] || type}`,
        apartment: "SISTEMA",
        date: new Date().toISOString().split("T")[0],
        status: "Autorizado", // audit log
      });
    } catch (err) {
      console.warn("Failed to log operational action:", err);
    }
  };

  const handleAuthorizeVisitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorApartment || !userProfile.conjuntoId) return;
    openPinModal("authorize_visitor", { visitorName, visitorApartment, visitorDate });
  };

  const handleRegisterPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgApartment || !pkgCourier || !userProfile.conjuntoId) return;
    openPinModal("register_package", { pkgApartment, pkgCourier, pkgTracking });
  };

  const renderVisitorForm = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Autorizar Ingreso de Visitante</h3>
      <form onSubmit={handleAuthorizeVisitor} className="space-y-4">
        <div>
          <label htmlFor="visitorName" className="block text-sm font-medium text-gray-700">
            Nombre del Visitante
          </label>
          <input
            type="text"
            id="visitorName"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="apartmentVisitor" className="block text-sm font-medium text-gray-700">
            Apartamento
          </label>
          <select
            id="apartmentVisitor"
            value={visitorApartment}
            onChange={(e) => setVisitorApartment(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white"
          >
            {residents.map((r) => (
              <option key={r.apartment} value={r.apartment}>
                Apto {r.apartment} - {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700">
            Fecha de Visita
          </label>
          <input
            type="date"
            id="visitDate"
            value={visitorDate}
            onChange={(e) => setVisitorDate(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmittingVisitor}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSubmittingVisitor ? "Autorizando..." : "Autorizar Ingreso"}
        </button>
        {visitorFeedback && <p className="text-sm text-green-600 text-center">{visitorFeedback}</p>}
      </form>
    </div>
  );

  const renderPackageForm = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Registrar Paquete</h3>
      <form onSubmit={handleRegisterPackage} className="space-y-4">
        <div>
          <label htmlFor="apartmentPackage" className="block text-sm font-medium text-gray-700">
            Apartamento
          </label>
          <select
            id="apartmentPackage"
            value={pkgApartment}
            onChange={(e) => setPkgApartment(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white"
          >
            {residents.map((r) => (
              <option key={r.apartment} value={r.apartment}>
                Apto {r.apartment} - {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="courier" className="block text-sm font-medium text-gray-700">
            Empresa de Transporte
          </label>
          <input
            type="text"
            id="courier"
            value={pkgCourier}
            onChange={(e) => setPkgCourier(e.target.value)}
            placeholder="Ej: Servientrega"
            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700">
            Número de Guía (Opcional)
          </label>
          <input
            type="text"
            id="trackingNumber"
            value={pkgTracking}
            onChange={(e) => setPkgTracking(e.target.value)}
            className="mt-1 w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmittingPackage}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSubmittingPackage ? "Registrando..." : "Registrar Recepción"}
        </button>
        {packageFeedback && <p className="text-sm text-green-600 text-center">{packageFeedback}</p>}
      </form>
    </div>
  );

  const renderVisitorsTable = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="md:hidden space-y-3 p-4">
        {visitorLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-semibold text-gray-900 text-sm truncate">{log.visitorName}</p>
              <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusChipStyle(log.status)}`}>
                {log.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Apto {log.apartment} � {log.date}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
              <span className="flex items-center gap-1">
                <Icon name="log-in" className="w-3.5 h-3.5 text-gray-400" />
                {log.entryTime || "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="log-in" className="w-3.5 h-3.5 text-gray-400 rotate-180" />
                {log.exitTime || "N/A"}
              </span>
            </div>
            {log.status === "Autorizado" && (
              <button
                onClick={() => openPinModal("register_entry", { logId: log.id })}
                disabled={updatingLogId === log.id}
                className="w-full text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 px-3 transition-colors disabled:text-gray-400 disabled:bg-gray-50 disabled:cursor-wait"
              >
                {updatingLogId === log.id ? "Registrando..." : "Registrar Ingreso"}
              </button>
            )}
            {log.status === "Ingresó" && (
              <button
                onClick={() => openPinModal("register_exit", { logId: log.id })}
                disabled={updatingLogId === log.id}
                className="w-full text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg py-2 px-3 transition-colors disabled:text-gray-400 disabled:bg-gray-50 disabled:cursor-wait"
              >
                {updatingLogId === log.id ? "Registrando..." : "Registrar Salida"}
              </button>
            )}
            {log.status === "Salió" && (
              <p className="text-center text-xs text-gray-500 font-medium py-2">Visita Completada</p>
            )}
          </div>
        ))}
        {visitorLogs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Icon name="user" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No hay visitas registradas</p>
          </div>
        )}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Fecha</th>
              <th scope="col" className="px-6 py-3">Visitante</th>
              <th scope="col" className="px-6 py-3">Apartamento</th>
              <th scope="col" className="px-6 py-3">Estado</th>
              <th scope="col" className="px-6 py-3">Hora Ingreso</th>
              <th scope="col" className="px-6 py-3">Hora Salida</th>
              <th scope="col" className="px-6 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visitorLogs.map((log) => (
              <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4">{log.date}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{log.visitorName}</td>
                <td className="px-6 py-4">{log.apartment}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipStyle(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4">{log.entryTime || "N/A"}</td>
                <td className="px-6 py-4">{log.exitTime || "N/A"}</td>
                <td className="px-6 py-4 text-center">
                  {log.status === "Autorizado" && (
                    <button
                      onClick={() => openPinModal("register_entry", { logId: log.id })}
                      disabled={updatingLogId === log.id}
                      className="font-medium text-blue-600 hover:underline text-xs disabled:text-gray-400 disabled:cursor-wait"
                    >
                      {updatingLogId === log.id ? "Registrando..." : "Registrar Ingreso"}
                    </button>
                  )}
                  {log.status === "Ingresó" && (
                    <button
                      onClick={() => openPinModal("register_exit", { logId: log.id })}
                      disabled={updatingLogId === log.id}
                      className="font-medium text-green-600 hover:underline text-xs disabled:text-gray-400 disabled:cursor-wait"
                    >
                      {updatingLogId === log.id ? "Registrando..." : "Registrar Salida"}
                    </button>
                  )}
                  {log.status === "Salió" && (
                    <span className="text-gray-500 text-xs font-medium">Visita Completada</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPackagesTable = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="md:hidden space-y-3 p-4">
        {packageLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-semibold text-gray-900 text-sm truncate">Apto {log.apartment}</p>
              <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusChipStyle(log.status)}`}>
                {log.status}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-1">{log.courier}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Icon name="clock" className="w-3.5 h-3.5 text-gray-400" />
                {new Date(log.receivedDate).toLocaleString("es-CO")}
              </span>
              {log.trackingNumber && <span className="truncate">Guía: {log.trackingNumber}</span>}
            </div>
            <button
              onClick={() => openPinModal("mark_delivered", { packageId: log.id })}
              disabled={log.status === "Entregado"}
              className="w-full text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg py-2 px-3 transition-colors disabled:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {log.status === "Entregado" ? "Entregado" : "Marcar Entregado"}
            </button>
          </div>
        ))}
        {packageLogs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Icon name="package" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No hay paquetes registrados</p>
          </div>
        )}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Fecha Recepción</th>
              <th scope="col" className="px-6 py-3">Apartamento</th>
              <th scope="col" className="px-6 py-3">Transportadora</th>
              <th scope="col" className="px-6 py-3">Estado</th>
              <th scope="col" className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {packageLogs.map((log) => (
              <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4">{new Date(log.receivedDate).toLocaleString("es-CO")}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{log.apartment}</td>
                <td className="px-6 py-4">{log.courier}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipStyle(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => openPinModal("mark_delivered", { packageId: log.id })}
                    disabled={log.status === "Entregado"}
                    className="font-medium text-green-600 hover:underline text-xs disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    Marcar Entregado
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      {/* Shift Control Header Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeShift ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            <Icon name="shield" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Control Operativo de Portería</h3>
            {activeShift ? (
              <p className="text-xs text-green-700 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Turno Activo: <span className="font-bold">{activeShift.guardName}</span> (Iniciado {activeShift.startedAt})
                {activeShift.isEmergency && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full">Novedad</span>}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">Sin turno activo en este punto de acceso.</p>
            )}
          </div>
        </div>

        <div>
          {activeShift ? (
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Icon name="user-check" className="w-4 h-4 text-gray-600" />
              Cambiar / Cerrar Turno
            </button>
          ) : (
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Icon name="log-in" className="w-4 h-4" />
              Inicia Turno
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex justify-between items-center" aria-label="Tabs">
          <div className="flex space-x-6">
            {(["Visitantes", "Paquetes"] as SeguridadTab[]).map((tab) => {
              const subtabId = "subtab-seguridad-" + tab.toLowerCase().replace(/[óíáéú]/g, (c) => ({ ó: "o", í: "i", á: "a", é: "e", ú: "u" })[c] || c);
              return (
                <button
                  key={tab}
                  id={subtabId}
                  onClick={() => setActiveTab(tab)}
                  className={`${activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <button onClick={handleRefresh} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100" aria-label="Refrescar datos">
            <Icon name="refresh-cw" className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </nav>
      </div>

      {actionFeedback && (
        <div className={`p-3 mb-4 rounded-md text-sm ${actionFeedback.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {actionFeedback.text}
        </div>
      )}

      {isLoading ? (
        <div className="text-center p-10">Cargando datos...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {activeTab === "Visitantes" ? renderVisitorForm() : renderPackageForm()}
          </div>
          <div className="lg:col-span-2">
            {activeTab === "Visitantes" ? renderVisitorsTable() : renderPackagesTable()}
          </div>
        </div>
      )}

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onStartShift={handleStartShift}
        conjuntoId={userProfile.conjuntoId || ""}
        accessPointName={accessPoints.find(ap => ap.id === selectedAccessPointId)?.name || "Portería Principal"}
      />

      <PinVerificationModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPendingAction(null);
        }}
        onVerify={handlePinVerified}
        conjuntoId={userProfile.conjuntoId || ""}
        title="Verificar Identidad"
        actionDescription={
          pendingAction
            ? {
                authorize_visitor: `Autorizar visitante: ${pendingAction.data.visitorName}`,
                register_package: `Registrar paquete para Apto ${pendingAction.data.pkgApartment}`,
                register_entry: "Registrar ingreso de visitante",
                register_exit: "Registrar salida de visitante",
                mark_delivered: "Marcar paquete como entregado",
              }[pendingAction.type]
            : "Confirme su identidad para continuar"
        }
      />
    </div>
  );
};

export default SeguridadView;
