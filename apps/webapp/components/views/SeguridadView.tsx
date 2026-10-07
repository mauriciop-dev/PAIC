import React, { useState, useEffect } from "react";
import { apiService } from "../../services/apiService";
import {
  VisitorLog,
  PackageLog,
  Resident,
  UserProfile,
  TurnoAuditoriaItem,
  Estacion,
} from "../../types";
import { Icon } from "@paic/ui";

type SeguridadTab = "Visitantes" | "Paquetes" | "Auditoría de Turnos";

interface SeguridadViewProps {
  userProfile: UserProfile;
  selectedAccessPointId: number | null;
}

const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "En curso";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const SeguridadView: React.FC<SeguridadViewProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<SeguridadTab>("Visitantes");
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [packageLogs, setPackageLogs] = useState<PackageLog[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [turnosAuditoria, setTurnosAuditoria] = useState<TurnoAuditoriaItem[]>([]);
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

  const fetchData = async () => {
    if (!userProfile.conjuntoId) return;
    setIsLoading(true);
    try {
      const [visitors, packages, res, ests, audit] = await Promise.all([
        apiService.fetchVisitorLogs(userProfile.conjuntoId),
        apiService.fetchPackageLogs(userProfile.conjuntoId),
        apiService.fetchResidents(userProfile.conjuntoId),
        apiService.fetchEstaciones(userProfile.conjuntoId),
        apiService.fetchTurnosAuditoria(userProfile.conjuntoId),
      ]);
      setVisitorLogs(visitors.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id));
      setPackageLogs(packages);
      setResidents(res);
      setEstaciones(ests);
      setTurnosAuditoria(audit);

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

  const handleAuthorizeVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorApartment || !userProfile.conjuntoId) return;
    setIsSubmittingVisitor(true);
    try {
      await apiService.addVisitorLog(userProfile.conjuntoId, {
        visitorName,
        apartment: visitorApartment,
        date: visitorDate,
        status: "Autorizado",
      });
      // Push notification to resident
      await apiService.sendPushNotification({
        conjuntoId: userProfile.conjuntoId,
        apartment: visitorApartment,
        title: "Visita Autorizada",
        body: `Se ha autorizado el ingreso de ${visitorName} para el ${visitorDate}`,
        type: "porteria",
        resourceId: `visitor-${Date.now()}`,
        url: "/visitantes",
      });
      setVisitorName("");
      setVisitorFeedback("✅ Visitante autorizado exitosamente.");
      setTimeout(() => setVisitorFeedback(null), 3000);
      fetchData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Error al registrar visitante." });
    } finally {
      setIsSubmittingVisitor(false);
    }
  };

  const handleRegisterPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgApartment || !pkgCourier || !userProfile.conjuntoId) return;
    setIsSubmittingPackage(true);
    try {
      await apiService.addPackageLog(userProfile.conjuntoId, {
        apartment: pkgApartment,
        courier: pkgCourier,
        trackingNumber: pkgTracking || undefined,
      });
      // Push notification to resident
      await apiService.sendPushNotification({
        conjuntoId: userProfile.conjuntoId,
        apartment: pkgApartment,
        title: "Nuevo Paquete en Portería",
        body: `Llegó un paquete de ${pkgCourier}${pkgTracking ? ` (Guía: ${pkgTracking})` : ""}`,
        type: "porteria",
        resourceId: `package-${Date.now()}`,
        url: "/paquetes",
      });
      setPkgCourier("");
      setPkgTracking("");
      setPackageFeedback("✅ Paquete registrado exitosamente.");
      setTimeout(() => setPackageFeedback(null), 3000);
      fetchData();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Error al registrar paquete." });
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  const handleRegisterEntry = async (logId: number) => {
    if (!userProfile.conjuntoId) return;
    setUpdatingLogId(logId);
    const now = formatTime(new Date());
    try {
      await apiService.updateVisitorLog(userProfile.conjuntoId, logId, {
        status: "Ingresó",
        entryTime: now,
      });
      // Push notification
      const log = visitorLogs.find(l => l.id === logId);
      if (log) {
        await apiService.sendPushNotification({
          conjuntoId: userProfile.conjuntoId,
          apartment: log.apartment,
          title: "Visitante Ingresó",
          body: `${log.visitorName} ha ingresado al conjunto a las ${now}`,
          type: "porteria",
          resourceId: `visitor-entry-${logId}`,
          url: "/visitantes",
        });
      }
      setVisitorLogs((prev) =>
        prev.map((log) => (log.id === logId ? { ...log, status: "Ingresó", entryTime: now } : log))
      );
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Error al registrar ingreso." });
    } finally {
      setUpdatingLogId(null);
    }
  };

  const handleRegisterExit = async (logId: number) => {
    if (!userProfile.conjuntoId) return;
    setUpdatingLogId(logId);
    const now = formatTime(new Date());
    try {
      await apiService.updateVisitorLog(userProfile.conjuntoId, logId, {
        status: "Salió",
        exitTime: now,
      });
      // Push notification
      const log = visitorLogs.find(l => l.id === logId);
      if (log) {
        await apiService.sendPushNotification({
          conjuntoId: userProfile.conjuntoId,
          apartment: log.apartment,
          title: "Visitante Salió",
          body: `${log.visitorName} ha salido del conjunto a las ${now}`,
          type: "porteria",
          resourceId: `visitor-exit-${logId}`,
          url: "/visitantes",
        });
      }
      setVisitorLogs((prev) =>
        prev.map((log) => (log.id === logId ? { ...log, status: "Salió", exitTime: now } : log))
      );
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Error al registrar salida." });
    } finally {
      setUpdatingLogId(null);
    }
  };

  const handleMarkDelivered = async (packageId: number) => {
    if (!userProfile.conjuntoId) return;
    try {
      await apiService.updatePackageLogStatus(userProfile.conjuntoId, packageId, "Entregado");
      // Push notification
      const pkg = packageLogs.find(p => p.id === packageId);
      if (pkg) {
        await apiService.sendPushNotification({
          conjuntoId: userProfile.conjuntoId,
          apartment: pkg.apartment,
          title: "Paquete Entregado",
          body: `Tu paquete de ${pkg.courier} ha sido marcado como entregado`,
          type: "porteria",
          resourceId: `package-delivered-${packageId}`,
          url: "/paquetes",
        });
      }
      setPackageLogs((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, status: "Entregado" } : p))
      );
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Error al entregar paquete." });
    }
  };

  const renderVisitorForm = () => (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Icon name="user" className="w-4 h-4 text-blue-600" />
        <span>Autorizar Ingreso de Visitante</span>
      </h3>
      <form onSubmit={handleAuthorizeVisitor} className="space-y-4">
        <div>
          <label htmlFor="visitorName" className="block text-xs font-semibold text-gray-700 mb-1">
            Nombre del Visitante
          </label>
          <input
            type="text"
            id="visitorName"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="apartmentVisitor" className="block text-xs font-semibold text-gray-700 mb-1">
            Apartamento
          </label>
          <select
            id="apartmentVisitor"
            value={visitorApartment}
            onChange={(e) => setVisitorApartment(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {residents.map((r) => (
              <option key={r.apartment} value={r.apartment}>
                Apto {r.apartment} - {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="visitDate" className="block text-xs font-semibold text-gray-700 mb-1">
            Fecha de Visita
          </label>
          <input
            type="date"
            id="visitDate"
            value={visitorDate}
            onChange={(e) => setVisitorDate(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmittingVisitor}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 disabled:bg-blue-300 transition-all"
        >
          {isSubmittingVisitor ? "Autorizando..." : "Autorizar Ingreso"}
        </button>
        {visitorFeedback && <p className="text-xs text-green-600 font-semibold text-center mt-2">{visitorFeedback}</p>}
      </form>
    </div>
  );

  const renderPackageForm = () => (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Icon name="package" className="w-4 h-4 text-blue-600" />
        <span>Registrar Paquete / Correspondencia</span>
      </h3>
      <form onSubmit={handleRegisterPackage} className="space-y-4">
        <div>
          <label htmlFor="apartmentPackage" className="block text-xs font-semibold text-gray-700 mb-1">
            Apartamento
          </label>
          <select
            id="apartmentPackage"
            value={pkgApartment}
            onChange={(e) => setPkgApartment(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {residents.map((r) => (
              <option key={r.apartment} value={r.apartment}>
                Apto {r.apartment} - {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="courier" className="block text-xs font-semibold text-gray-700 mb-1">
            Empresa de Transporte
          </label>
          <input
            type="text"
            id="courier"
            value={pkgCourier}
            onChange={(e) => setPkgCourier(e.target.value)}
            placeholder="Ej: Servientrega, Envia"
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="trackingNumber" className="block text-xs font-semibold text-gray-700 mb-1">
            Número de Guía (Opcional)
          </label>
          <input
            type="text"
            id="trackingNumber"
            value={pkgTracking}
            onChange={(e) => setPkgTracking(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmittingPackage}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 disabled:bg-blue-300 transition-all"
        >
          {isSubmittingPackage ? "Registrando..." : "Registrar Recepción"}
        </button>
        {packageFeedback && <p className="text-xs text-green-600 font-semibold text-center mt-2">{packageFeedback}</p>}
      </form>
    </div>
  );

  const renderVisitorsTable = () => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-gray-600">
          <thead className="text-[11px] text-gray-700 uppercase bg-gray-50 font-bold border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Visitante</th>
              <th className="px-4 py-3">Apartamento</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Hora Ingreso</th>
              <th className="px-4 py-3">Hora Salida</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visitorLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{log.date}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{log.visitorName}</td>
                <td className="px-4 py-3 font-medium">Apto {log.apartment}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${getStatusChipStyle(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3">{log.entryTime || "—"}</td>
                <td className="px-4 py-3">{log.exitTime || "—"}</td>
                <td className="px-4 py-3 text-center">
                  {log.status === "Autorizado" && (
                    <button
                      onClick={() => handleRegisterEntry(log.id)}
                      disabled={updatingLogId === log.id}
                      className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      Ingreso
                    </button>
                  )}
                  {log.status === "Ingresó" && (
                    <button
                      onClick={() => handleRegisterExit(log.id)}
                      disabled={updatingLogId === log.id}
                      className="px-2.5 py-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      Salida
                    </button>
                  )}
                  {log.status === "Salió" && (
                    <span className="text-[11px] text-gray-400 font-medium">Completado</span>
                  )}
                </td>
              </tr>
            ))}
            {visitorLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  No hay visitas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPackagesTable = () => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-gray-600">
          <thead className="text-[11px] text-gray-700 uppercase bg-gray-50 font-bold border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Fecha Recepción</th>
              <th className="px-4 py-3">Apartamento</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Guía</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {packageLogs.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">{pkg.receivedDate}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">Apto {pkg.apartment}</td>
                <td className="px-4 py-3 font-medium">{pkg.courier}</td>
                <td className="px-4 py-3 font-mono text-gray-500">{pkg.trackingNumber || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${getStatusChipStyle(pkg.status)}`}>
                    {pkg.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {pkg.status === "En recepción" ? (
                    <button
                      onClick={() => handleMarkDelivered(pkg.id)}
                      className="px-2.5 py-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      Marcar Entregado
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium">Entregado</span>
                  )}
                </td>
              </tr>
            ))}
            {packageLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  No hay paquetes registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAuditoriaTab = () => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Bitácora Legal de Turnos de Vigilancia</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Registro histórico inmutable de aperturas, cierres y novedades de servicio por estación.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Icon name="refresh-cw" className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar Bitácora
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-gray-600">
          <thead className="text-[11px] text-gray-700 uppercase bg-gray-50 font-bold border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Estación</th>
              <th className="px-4 py-3">Vigilante en Turno</th>
              <th className="px-4 py-3">Cédula</th>
              <th className="px-4 py-3">Tipo de Turno</th>
              <th className="px-4 py-3">Inicio de Turno</th>
              <th className="px-4 py-3">Cierre de Turno</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {turnosAuditoria.map((turno) => (
              <tr key={turno.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-bold text-gray-900 block">{turno.estacion_nombre}</span>
                  <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {turno.codigo_estacion}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">
                  {turno.vigilante_nombre}
                  {turno.motivo_reemplazo && (
                    <span className="block text-[10px] font-normal text-amber-700 mt-0.5 italic">
                      Motivo: {turno.motivo_reemplazo}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-gray-700">{turno.vigilante_cedula}</td>
                <td className="px-4 py-3">
                  {turno.es_emergencia ? (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                      Reemplazo / Emergencia
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                      Ordinario
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-medium">
                  {formatDateTime(turno.fecha_inicio)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-medium">
                  {formatDateTime(turno.fecha_fin)}
                </td>
                <td className="px-4 py-3 text-center">
                  {turno.estado === "ACTIVO" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-green-100 text-green-800 font-bold text-[10px] rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                      ACTIVO
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 font-semibold text-[10px] rounded-full">
                      FINALIZADO
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {turnosAuditoria.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No hay registros de turnos de vigilancia en la bitácora histórica.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner with Kiosk Access Link */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-lg flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Icon name="shield" className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Módulo de Seguridad y Vigilancia</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Supervisión administrativa de puntos de acceso, bitácoras de visitantes y auditoría de turnos.
            </p>
          </div>
        </div>

        <a
          href="/seguridad/kiosco"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 bg-white text-blue-800 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <Icon name="external-link" className="w-4 h-4" />
          <span>Abrir Kiosco de Portería</span>
        </a>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex justify-between items-center" aria-label="Tabs">
          <div className="flex space-x-6">
            {(["Visitantes", "Paquetes", "Auditoría de Turnos"] as SeguridadTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium"
                } whitespace-nowrap py-3 px-1 border-b-2 text-sm transition-all`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
            title="Refrescar datos"
          >
            <Icon name="refresh-cw" className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </nav>
      </div>

      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            actionFeedback.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          <Icon name={actionFeedback.type === "error" ? "alert-triangle" : "check"} className="w-4 h-4 flex-shrink-0" />
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">
          <Icon name="refresh-cw" className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs font-medium">Cargando módulo de seguridad...</p>
        </div>
      ) : activeTab === "Auditoría de Turnos" ? (
        renderAuditoriaTab()
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
    </div>
  );
};

export default SeguridadView;
