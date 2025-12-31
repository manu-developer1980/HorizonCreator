import React, { useState, useEffect } from 'react';
import { Download, FileText, Share2, Settings, Copy, Check } from 'lucide-react';
import { exportToCSV, getCurrentSession, getCoverageStats } from '../services/database';
import type { CSVExportConfig } from '../types';

const ExportPage: React.FC = () => {
  const [config, setConfig] = useState<CSVExportConfig>({
    filename: 'horizon_nina',
    delimiter: ',',
    includeTimestamp: false,
    coordinateFormat: 'decimal'
  });
  const [csvPreview, setCsvPreview] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [coverageStats, setCoverageStats] = useState<any>(null);

  useEffect(() => {
    loadSessionData();
  }, []);

  useEffect(() => {
    generatePreview();
  }, [config]);

  const loadSessionData = async () => {
    try {
      const currentSession = await getCurrentSession();
      if (currentSession) {
        setSessionInfo(currentSession);
        const stats = await getCoverageStats(currentSession.id);
        setCoverageStats(stats);
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };

  const generatePreview = async () => {
    try {
      const currentSession = await getCurrentSession();
      if (!currentSession) {
        setCsvPreview('No hay sesión activa');
        return;
      }

      const csv = await exportToCSV(currentSession.id, config.delimiter);
      
      // Show only first 10 lines for preview
      const lines = csv.split('\n');
      const previewLines = lines.slice(0, 11); // Header + 10 data rows
      
      if (lines.length > 11) {
        previewLines.push(`... (${lines.length - 11} more rows)`);
      }
      
      setCsvPreview(previewLines.join('\n'));
      setExportError(null);
    } catch (error) {
      setCsvPreview('');
      setExportError(error instanceof Error ? error.message : 'Error generating preview');
    }
  };

  const downloadCSV = async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      const currentSession = await getCurrentSession();
      if (!currentSession) {
        throw new Error('No hay sesión activa');
      }

      const csv = await exportToCSV(currentSession.id, config.delimiter);
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${config.filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Fallback for browsers that don't support download
        const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        window.open(csvContent);
      }

    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Error downloading file');
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const currentSession = await getCurrentSession();
      if (!currentSession) {
        setExportError('No hay sesión activa');
        return;
      }

      const csv = await exportToCSV(currentSession.id, config.delimiter);
      await navigator.clipboard.writeText(csv);
      
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
      
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Error copying to clipboard');
    }
  };

  const shareFile = async () => {
    try {
      const currentSession = await getCurrentSession();
      if (!currentSession) {
        setExportError('No hay sesión activa');
        return;
      }

      const csv = await exportToCSV(currentSession.id, config.delimiter);
      const blob = new Blob([csv], { type: 'text/csv' });
      const file = new File([blob], `${config.filename}.csv`, { type: 'text/csv' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Horizonte para N.I.N.A.',
          text: `Archivo de horizonte con ${coverageStats?.totalPoints || 0} puntos`
        });
      } else {
        // Fallback to download if sharing is not supported
        await downloadCSV();
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setExportError(error.message);
      }
    }
  };

  // const formatCoordinate = (value: number, type: 'azimuth' | 'altitude'): string => {
  //   if (config.coordinateFormat === 'dms') {
  //     // Convert to degrees, minutes, seconds
  //     const degrees = Math.floor(Math.abs(value));
  //     const minutes = Math.floor((Math.abs(value) - degrees) * 60);
  //     const seconds = ((Math.abs(value) - degrees - minutes / 60) * 3600).toFixed(1);
  //     
  //     const direction = type === 'azimuth' 
  //       ? (value < 0 ? 'W' : 'E')
  //       : (value < 0 ? 'S' : 'N');
  //     
  //     return `${degrees}°${minutes}'${seconds}"${direction}`;
  //   }
  //   
  //   return value.toFixed(1) + '°';
  // };

  if (exportError && !csvPreview) {
    return (
      <div className="flex items-center justify-center h-full bg-space-950">
        <div className="text-center p-8">
          <div className="text-red-400 text-lg mb-4">Error</div>
          <div className="text-gray-300 mb-6">{exportError}</div>
          <button
            onClick={loadSessionData}
            className="nav-button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-space-950 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-space-900 border-b border-space-700 p-4">
          <h1 className="text-xl font-bold text-white">Exportar para N.I.N.A.</h1>
          {sessionInfo && (
            <div className="mt-2 text-sm text-gray-300">
              Sesión: {new Date(sessionInfo.startTime).toLocaleDateString('es-ES')}
              {sessionInfo.locationName && ` - ${sessionInfo.locationName}`}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="p-4 space-y-4">
          <div className="export-form">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configuración de Exportación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del archivo
                </label>
                <input
                  type="text"
                  value={config.filename}
                  onChange={(e) => setConfig(prev => ({ ...prev, filename: e.target.value }))}
                  className="form-input w-full"
                  placeholder="horizon_nina"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delimitador
                </label>
                <select
                  value={config.delimiter}
                  onChange={(e) => setConfig(prev => ({ ...prev, delimiter: e.target.value as ',' | ';' }))}
                  className="form-input w-full"
                >
                  <option value=",">Coma (,)</option>
                  <option value=";">Punto y coma (;)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Formato de coordenadas
                </label>
                <select
                  value={config.coordinateFormat}
                  onChange={(e) => setConfig(prev => ({ ...prev, coordinateFormat: e.target.value as 'decimal' | 'dms' }))}
                  className="form-input w-full"
                >
                  <option value="decimal">Decimal (123.4°)</option>
                  <option value="dms">GMS (123°45'30")</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeTimestamp"
                  checked={config.includeTimestamp}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeTimestamp: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="includeTimestamp" className="text-sm text-gray-300">
                  Incluir timestamp en el archivo
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="export-form">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Vista Previa
            </h3>
            
            {csvPreview && (
              <div className="csv-preview mb-4">
                {csvPreview}
              </div>
            )}
            
            {coverageStats && (
              <div className="text-sm text-gray-300 space-y-1">
                <div>Puntos exportados: {coverageStats.totalPoints}</div>
                <div>Rango de azimut: {coverageStats.azimuthRange.toFixed(1)}°</div>
                <div>Altitud media: {coverageStats.avgAltitude.toFixed(1)}°</div>
                {coverageStats.gaps.length > 0 && (
                  <div className="text-yellow-400">
                    ⚠️ Hay {coverageStats.gaps.length} huecos en la cobertura
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {exportError && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 m-4 rounded">
            <div className="flex">
              <span className="text-sm">{exportError}</span>
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="bg-space-900 border-t border-space-700 p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={downloadCSV}
              disabled={isExporting || !csvPreview}
              className="nav-button bg-astro-600 hover:bg-astro-700 text-white"
            >
              <Download className="w-5 h-5" />
              {isExporting ? 'Exportando...' : 'Descargar CSV'}
            </button>

            <button
              onClick={copyToClipboard}
              disabled={!csvPreview}
              className="nav-button"
            >
              {copiedToClipboard ? (
                <>
                  <Check className="w-5 h-5" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copiar al portapapeles
                </>
              )}
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={shareFile}
                disabled={!csvPreview}
                className="nav-button"
              >
                <Share2 className="w-5 h-5" />
                Compartir
              </button>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-400">
            <p>Formato compatible con N.I.N.A. (Nighttime Imaging 'N' Astronomy)</p>
            <p>El archivo contiene coordenadas de azimut y altitud para definir el horizonte.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;