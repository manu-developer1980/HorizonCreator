import React, { useState, useEffect } from "react";
import { Camera, List, Share2, Settings } from "lucide-react";
import CapturePage from "./components/CapturePage";
import PointsList from "./components/PointsList";
import ExportPage from "./components/ExportPage";

export type Page = "capture" | "points" | "export" | "settings";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>("capture");
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(true);

  useEffect(() => {
    // Check if app is installed as PWA
    const checkPWAInstallation = () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(() => {
          // Check if running in standalone mode (installed PWA)
          const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;
          setIsPWAInstalled(isStandalone);
        });
      }
    };

    checkPWAInstallation();

    // Listen for PWA installation
    window.addEventListener("appinstalled", () => {
      setIsPWAInstalled(true);
    });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case "capture":
        return <CapturePage onNavigate={setCurrentPage} />;
      case "points":
        return <PointsList />;
      case "export":
        return <ExportPage />;
      case "settings":
        return (
          <div className="flex items-center justify-center h-full bg-space-950 text-white">
            <div className="text-center">
              <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Configuración</h2>
              <p className="text-gray-400">Próximamente...</p>
            </div>
          </div>
        );
      default:
        return <CapturePage />;
    }
  };

  const NavButton: React.FC<{
    page: Page;
    icon: React.ReactNode;
    label: string;
  }> = ({ page, icon, label }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex flex-col items-center p-3 rounded-lg transition-all ${
        currentPage === page
          ? "bg-astro-600 text-white"
          : "text-gray-400 hover:text-white hover:bg-space-800"
      }`}>
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  return (
    <div className="h-screen bg-space-950 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">{renderPage()}</div>

      {/* Bottom Navigation */}
      <div className="bg-space-900 border-t border-space-700 p-2">
        <div className="flex justify-around">
          <NavButton
            page="capture"
            icon={<Camera className="w-6 h-6" />}
            label="Capturar"
          />
          <NavButton
            page="points"
            icon={<List className="w-6 h-6" />}
            label="Puntos"
          />
          <NavButton
            page="export"
            icon={<Share2 className="w-6 h-6" />}
            label="Exportar"
          />
          <NavButton
            page="settings"
            icon={<Settings className="w-6 h-6" />}
            label="Ajustes"
          />
        </div>
      </div>

      {/* PWA Install Prompt */}
      {!isPWAInstalled && !installDismissed && (
        <div className="fixed bottom-20 left-4 right-4 bg-astro-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">Instalar aplicación</p>
              <p className="text-sm opacity-90">
                Instala esta aplicación para usarla sin conexión
              </p>
            </div>
            <button
              onClick={() => {
                // This will be handled by the PWA install prompt
                if (
                  "serviceWorker" in navigator &&
                  "BeforeInstallPromptEvent" in window
                ) {
                  // The browser will show the install prompt
                  window.dispatchEvent(new Event("beforeinstallprompt"));
                }
              }}
              className="bg-white text-astro-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              Instalar
            </button>
            <button
              onClick={() => setInstallDismissed(true)}
              className="ml-2 px-3 py-2 rounded-lg bg-space-800 text-white">
              Ocultar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
