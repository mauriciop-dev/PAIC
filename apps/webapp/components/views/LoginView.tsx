import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";
import { Icon } from "@paic/ui";
import { apiService } from "../../services/apiService";
import { PlatformUser, EstacionSession } from "../../types";
import { analytics } from "../../services/analytics";

interface LoginViewProps {
  onInternalAuthSuccess: (user: PlatformUser) => void;
  onStationAuthSuccess?: (station: EstacionSession) => void;
  onNavigateToKiosk?: () => void;
}

type LoginTab = "admin" | "station";

const LoginView: React.FC<LoginViewProps> = ({
  onInternalAuthSuccess,
  onStationAuthSuccess,
  onNavigateToKiosk,
}) => {
  const [activeTab, setActiveTab] = useState<LoginTab>("admin");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingStation, setIsLoadingStation] = useState(false);
  const [isMarketingFlow, setIsMarketingFlow] = useState(false);

  // Form states - Admin
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Form states - Station
  const [stationCode, setStationCode] = useState("");
  const [stationPassword, setStationPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "marketing") {
      setIsMarketingFlow(true);
    }
    if (params.get("tab") === "porteria" || params.get("tab") === "estacion") {
      setActiveTab("station");
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) setError(error.message);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoadingEmail(true);
    try {
      const user = await apiService.authenticateUser(email, password);
      if (user) {
        onInternalAuthSuccess(user);
      } else {
        setError("Correo electrónico o contraseña incorrectos.");
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al iniciar sesión.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleStationConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoadingStation(true);
    try {
      const station = await apiService.authenticateStation(stationCode, stationPassword);
      setSuccessMessage(`¡Estación "${station.nombre}" conectada con éxito!`);
      if (onStationAuthSuccess) {
        onStationAuthSuccess(station);
      } else if (onNavigateToKiosk) {
        onNavigateToKiosk();
      } else {
        window.location.href = "/seguridad/kiosco";
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar la estación. Verifique el código y la contraseña.");
    } finally {
      setIsLoadingStation(false);
    }
  };

  const handleGoToKiosk = (e: React.MouseEvent) => {
    e.preventDefault();
    const existingStation = apiService.getStationSession();
    if (existingStation) {
      if (onNavigateToKiosk) {
        onNavigateToKiosk();
      } else {
        window.location.href = "/seguridad/kiosco";
      }
    } else {
      setError("No hay ninguna estación conectada en este equipo. Por favor, ingresa el ID y contraseña.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Header Branding */}
        <div className="pt-8 pb-6 px-6 sm:px-8 text-center bg-gradient-to-b from-blue-50/50 to-white">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Icon name="shield" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-4 tracking-tight">
            PAIC
          </h1>
          <p className="text-xs font-semibold text-blue-600 tracking-wider uppercase mt-0.5">
            Plataforma de Administración Inteligente de Conjuntos
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {isMarketingFlow
              ? "Empieza tu prueba gratuita de 14 días"
              : activeTab === "admin"
              ? "Acceso seguro para Administradores y Staff"
              : "Conexión de Puntos de Control y Porterías"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setError(null);
            }}
            className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === "admin"
                ? "bg-white text-blue-600 border-t-2 border-t-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            }`}
          >
            <Icon name="user" className="w-4 h-4" />
            <span>Administración y Staff</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("station");
              setError(null);
            }}
            className={`flex-1 py-3 px-3 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === "station"
                ? "bg-white text-blue-600 border-t-2 border-t-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            }`}
          >
            <Icon name="shield" className="w-4 h-4" />
            <span>Puntos de Acceso / Portería</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2.5">
              <Icon name="alert-triangle" className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-medium flex items-center gap-2.5">
              <Icon name="check" className="w-4 h-4 flex-shrink-0 text-green-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === "admin" ? (
            /* TAB A: Administración y Staff */
            <div className="space-y-4">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 p-3 border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium text-sm text-gray-700 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                  ></path>
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
                  ></path>
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.356-11.056-7.923l-6.571 4.819C9.656 39.663 16.318 44 24 44z"
                  ></path>
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C41.383 36.641 44 31.023 44 24c0-1.341-.138-2.65-.389-3.917z"
                  ></path>
                </svg>
                <span>Continuar con Google</span>
              </button>

              {/* Separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 font-semibold tracking-wider">O CORREO</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tuconjunto.com"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingEmail}
                  className="w-full p-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:bg-blue-300 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all mt-2"
                >
                  <Icon name="log-in" className="w-4 h-4" />
                  {isLoadingEmail ? "Verificando..." : "Iniciar Sesión"}
                </button>
              </form>
            </div>
          ) : (
            /* TAB B: Puntos de Acceso / Portería */
            <div className="space-y-5">
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <Icon name="shield" className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p>
                  Conecta este dispositivo como punto de control o portería fija ingresando las credenciales asignadas por el administrador.
                </p>
              </div>

              <form onSubmit={handleStationConnect} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ID de Estación
                  </label>
                  <input
                    type="text"
                    value={stationCode}
                    onChange={(e) => setStationCode(e.target.value)}
                    placeholder="Ej. EST-TORRE1 o PORT-PRINCIPAL"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm uppercase tracking-wider font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Contraseña de Estación
                  </label>
                  <input
                    type="password"
                    value={stationPassword}
                    onChange={(e) => setStationPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoadingStation}
                  className="w-full p-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:bg-blue-300 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Icon name="check" className="w-4 h-4" />
                  {isLoadingStation ? "Conectando estación..." : "Conectar Estación"}
                </button>
              </form>

              {/* Auxiliary link */}
              <div className="pt-2 text-center border-t border-gray-100">
                <a
                  href="/seguridad/kiosco"
                  onClick={handleGoToKiosk}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  <span>¿La estación ya está conectada en este equipo?</span>
                  <span className="font-bold">Ir al Módulo de Seguridad &rarr;</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="py-3.5 px-6 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400 font-medium">
            PAIC &bull; Sistema Seguro de Administración y Seguridad en Copropiedades
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
