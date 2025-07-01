import React from 'react';
import { CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface DataStatusProps {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRefresh?: () => void;
  className?: string;
}

export const DataStatus: React.FC<DataStatusProps> = ({
  loading,
  error,
  lastUpdated,
  onRefresh,
  className = ''
}) => {
  const getStatusIcon = () => {
    if (loading) return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
    if (error) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (loading) return 'Updating...';
    if (error) return 'Error loading data';
    if (lastUpdated) return `Updated ${lastUpdated.toLocaleTimeString()}`;
    return 'Ready';
  };

  const getStatusColor = () => {
    if (loading) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (error) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border ${getStatusColor()} ${className}`}>
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      {onRefresh && !loading && (
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-white/50 rounded transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};