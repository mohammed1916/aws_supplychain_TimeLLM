import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Activity,
  Settings,
  Bell,
  Search,
  Brain,
  Cloud,
  Zap,
  Database,
  Shield,
  FileText,
  Truck
} from 'lucide-react';

import { DataIngestionPanel } from './components/DataIngestionPanel';
import { LogisticsOptimization } from './components/LogisticsOptimization';
import { MonitoringAlerts } from './components/MonitoringAlerts';
import { ReportingAnalytics } from './components/ReportingAnalytics';
import { ResponsibleAI } from './components/ResponsibleAI';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const forecastData = [
    { month: 'Jan', demand: 850, actual: 820, accuracy: 96.5 },
    { month: 'Feb', demand: 920, actual: 890, accuracy: 96.7 },
    { month: 'Mar', demand: 1100, actual: 1050, accuracy: 95.5 },
    { month: 'Apr', demand: 1250, actual: 1180, accuracy: 94.4 },
    { month: 'May', demand: 1350, actual: 1320, accuracy: 97.8 },
    { month: 'Jun', demand: 1400, actual: null, accuracy: null }
  ];

  const inventoryAlerts = [
    { product: 'Wireless Headphones Pro', status: 'overstock', quantity: 2340, threshold: 1800, severity: 'high' },
    { product: 'Smart Watch Series X', status: 'reorder', quantity: 150, threshold: 300, severity: 'critical' },
    { product: 'Laptop Charger USB-C', status: 'optimal', quantity: 890, threshold: 800, severity: 'low' },
    { product: 'Gaming Mouse Elite', status: 'reorder', quantity: 45, threshold: 100, severity: 'medium' }
  ];

  const kpiData = [
    { label: 'Forecast Accuracy', value: '96.2%', change: '+2.1%', trend: 'up' },
    { label: 'Inventory Turnover', value: '8.4x', change: '+0.7x', trend: 'up' },
    { label: 'Stockout Rate', value: '1.3%', change: '-0.8%', trend: 'down' },
    { label: 'Cost Savings', value: '$2.1M', change: '+$340K', trend: 'up' }
  ];

  const awsServices = [
    {
      name: 'SageMaker',
      description: 'TimeLLM model training & inference',
      status: 'active',
      metrics: '96.2% accuracy',
      icon: Brain,
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'S3 + Glue',
      description: 'Data lake & ETL processing',
      status: 'processing',
      metrics: '2.8TB processed',
      icon: Database,
      color: 'from-green-500 to-green-600'
    },
    {
      name: 'CloudWatch',
      description: 'Real-time monitoring & alerts',
      status: 'monitoring',
      metrics: '847 active metrics',
      icon: Activity,
      color: 'from-orange-500 to-orange-600'
    },
    {
      name: 'QuickSight',
      description: 'Business intelligence dashboards',
      status: 'active',
      metrics: '47 dashboards',
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">TimeWise Supply Chain</h1>
                  <p className="text-sm text-slate-500">AWS TimeLLM-Powered Optimization Platform</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search products, forecasts..."
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white/80"
                />
              </div>
              <button className="relative p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-slate-200">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'data-ingestion', label: 'Data Pipeline', icon: Database },
            { id: 'optimization', label: 'Optimization', icon: Truck },
            { id: 'monitoring', label: 'Monitoring', icon: AlertTriangle },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'responsible-ai', label: 'Responsible AI', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-700 shadow-md border border-blue-100' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpiData.map((kpi, index) => (
                <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-slate-600 text-sm font-medium">{kpi.label}</p>
                    <div className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full ${
                      kpi.trend === 'up' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                    }`}>
                      <TrendingUp className={`w-3 h-3 ${kpi.trend === 'down' ? 'rotate-180' : ''}`} />
                      <span>{kpi.change}</span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-800 mb-2">{kpi.value}</p>
                  <div className="w-full bg-slate-200 rounded-full h-1">
                    <div className={`h-1 rounded-full ${
                      kpi.trend === 'up' ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-red-500'
                    }`} style={{ width: '75%' }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* AWS Services Overview */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">AWS Services Architecture</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {awsServices.map((service, index) => (
                  <div key={index} className="p-4 bg-white/50 rounded-xl border border-slate-100 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${service.color} rounded-lg flex items-center justify-center`}>
                        <service.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{service.name}</h4>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          service.status === 'active' ? 'bg-green-100 text-green-700' :
                          service.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {service.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{service.description}</p>
                    <p className="text-xs text-slate-500">{service.metrics}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* TimeLLM Forecast Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800">TimeLLM Demand Forecast</h3>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">Predicted</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                      <span className="text-xs text-slate-600">Actual</span>
                    </div>
                  </div>
                </div>
                
                <div className="relative h-80">
                  <div className="absolute inset-0 flex items-end justify-between px-4">
                    {forecastData.map((data, index) => (
                      <div key={index} className="flex flex-col items-center space-y-2 group">
                        <div className="relative flex space-x-1">
                          <div 
                            className="w-8 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md hover:from-blue-600 hover:to-blue-500 transition-colors cursor-pointer"
                            style={{ height: `${(data.demand / 1500) * 250}px` }}
                            title={`Predicted: ${data.demand}`}
                          ></div>
                          {data.actual && (
                            <div 
                              className="w-8 bg-gradient-to-t from-teal-500 to-teal-400 rounded-t-md hover:from-teal-600 hover:to-teal-500 transition-colors cursor-pointer"
                              style={{ height: `${(data.actual / 1500) * 250}px` }}
                              title={`Actual: ${data.actual}`}
                            ></div>
                          )}
                        </div>
                        <span className="text-xs text-slate-600 font-medium">{data.month}</span>
                        {data.accuracy && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                            {data.accuracy}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Critical Alerts */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Critical Alerts</h3>
                
                <div className="space-y-3">
                  {inventoryAlerts.slice(0, 3).map((alert, index) => (
                    <div key={index} className={`p-3 rounded-xl border-l-4 ${
                      alert.severity === 'critical' 
                        ? 'bg-red-50 border-red-400 border border-red-200' 
                        : alert.severity === 'high'
                        ? 'bg-orange-50 border-orange-400 border border-orange-200'
                        : alert.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-400 border border-yellow-200'
                        : 'bg-green-50 border-green-400 border border-green-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-800 text-sm">{alert.product}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">
                        {alert.status === 'overstock' ? 'Overstock detected' : 'Reorder recommended'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Current: {alert.quantity} | Threshold: {alert.threshold}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data-ingestion' && (
          <DataIngestionPanel onDataUpdate={() => {}} />
        )}

        {activeTab === 'optimization' && (
          <LogisticsOptimization />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringAlerts />
        )}

        {activeTab === 'analytics' && (
          <ReportingAnalytics />
        )}

        {activeTab === 'responsible-ai' && (
          <ResponsibleAI />
        )}
      </div>
    </div>
  );
}

export default App;