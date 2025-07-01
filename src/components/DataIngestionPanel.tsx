import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  FileText,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: 'S3' | 'Kinesis' | 'RDS' | 'API';
  status: 'active' | 'processing' | 'error' | 'idle';
  lastSync: string;
  recordsProcessed: number;
  dataQuality: number;
}

interface DataIngestionPanelProps {
  onDataUpdate: (data: any) => void;
}

export const DataIngestionPanel: React.FC<DataIngestionPanelProps> = ({ onDataUpdate }) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: 'sales-data',
      name: 'Historical Sales Data',
      type: 'S3',
      status: 'active',
      lastSync: '2024-01-15T10:30:00Z',
      recordsProcessed: 2847392,
      dataQuality: 98.5
    },
    {
      id: 'market-trends',
      name: 'Market Trends API',
      type: 'API',
      status: 'processing',
      lastSync: '2024-01-15T10:25:00Z',
      recordsProcessed: 156789,
      dataQuality: 96.2
    },
    {
      id: 'inventory-stream',
      name: 'Real-time Inventory',
      type: 'Kinesis',
      status: 'active',
      lastSync: '2024-01-15T10:32:00Z',
      recordsProcessed: 45623,
      dataQuality: 99.1
    },
    {
      id: 'supplier-data',
      name: 'Supplier Database',
      type: 'RDS',
      status: 'idle',
      lastSync: '2024-01-15T09:15:00Z',
      recordsProcessed: 12456,
      dataQuality: 94.7
    }
  ]);

  const [processingStats, setProcessingStats] = useState({
    totalRecords: 3062260,
    processedToday: 156789,
    dataQualityAvg: 97.1,
    pipelineHealth: 98.3
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'processing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Processing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Records</p>
              <p className="text-xl font-bold text-slate-800">{processingStats.totalRecords.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Processed Today</p>
              <p className="text-xl font-bold text-slate-800">{processingStats.processedToday.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Data Quality</p>
              <p className="text-xl font-bold text-slate-800">{processingStats.dataQualityAvg}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pipeline Health</p>
              <p className="text-xl font-bold text-slate-800">{processingStats.pipelineHealth}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">AWS Data Sources</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Add Source</span>
          </button>
        </div>

        <div className="space-y-4">
          {dataSources.map((source) => (
            <div key={source.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(source.status)}`}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(source.status)}
                    <span>{source.status.toUpperCase()}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-slate-800">{source.name}</h4>
                  <p className="text-sm text-slate-600">
                    {source.type} • Last sync: {new Date(source.lastSync).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="text-slate-600">Records</p>
                  <p className="font-semibold text-slate-800">{source.recordsProcessed.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-600">Quality</p>
                  <p className={`font-semibold ${source.dataQuality > 95 ? 'text-green-600' : source.dataQuality > 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {source.dataQuality}%
                  </p>
                </div>
                <button className="px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AWS Glue ETL Pipeline */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">AWS Glue ETL Pipeline</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Data Extraction</span>
            </div>
            <p className="text-sm text-blue-700">Extracting from S3, RDS, and APIs</p>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
            <div className="flex items-center space-x-3 mb-3">
              <Activity className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Transformation</span>
            </div>
            <p className="text-sm text-yellow-700">Cleaning and normalizing data</p>
            <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Loading</span>
            </div>
            <p className="text-sm text-green-700">Ready for TimeLLM processing</p>
            <div className="mt-2 w-full bg-green-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};