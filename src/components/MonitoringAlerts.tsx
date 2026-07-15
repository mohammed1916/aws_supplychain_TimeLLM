import { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Zap,
  Eye,
  Settings
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: 'inventory' | 'demand' | 'supply' | 'system' | 'security';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
  actionRequired: boolean;
  metadata?: {
    productId?: string;
    threshold?: number;
    currentValue?: number;
    impact?: string;
  };
}

interface MetricCard {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  status: 'healthy' | 'warning' | 'critical';
  threshold: number;
  source: string;
}

export const MonitoringAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alert-001',
      type: 'critical',
      category: 'inventory',
      title: 'Critical Stock Level - Smart Watch Series X',
      message: 'Stock level has fallen below critical threshold. Immediate reorder required.',
      timestamp: '2024-01-15T10:32:00Z',
      source: 'AWS CloudWatch',
      acknowledged: false,
      actionRequired: true,
      metadata: {
        productId: 'SW-002',
        threshold: 100,
        currentValue: 45,
        impact: 'Potential stockout in 3 days'
      }
    },
    {
      id: 'alert-002',
      type: 'warning',
      category: 'demand',
      title: 'Demand Spike Detected - Gaming Mouse Elite',
      message: 'TimeLLM detected 35% increase in demand forecast for next month.',
      timestamp: '2024-01-15T10:28:00Z',
      source: 'SageMaker TimeLLM',
      acknowledged: false,
      actionRequired: true,
      metadata: {
        productId: 'GM-004',
        currentValue: 135,
        impact: 'Adjust procurement by +35%'
      }
    },
    {
      id: 'alert-003',
      type: 'info',
      category: 'system',
      title: 'Model Retraining Completed',
      message: 'TimeLLM model successfully retrained with latest data. Accuracy improved to 96.8%.',
      timestamp: '2024-01-15T09:45:00Z',
      source: 'AWS SageMaker',
      acknowledged: true,
      actionRequired: false
    },
    {
      id: 'alert-004',
      type: 'warning',
      category: 'supply',
      title: 'Supplier Delay Risk - Wireless Headphones',
      message: 'Supplier ABC Corp showing delivery delays. Consider alternative suppliers.',
      timestamp: '2024-01-15T08:15:00Z',
      source: 'Supply Chain Monitor',
      acknowledged: false,
      actionRequired: true,
      metadata: {
        productId: 'WH-001',
        impact: 'Potential 5-day delay'
      }
    }
  ]);

  const [metrics] = useState<MetricCard[]>([
    {
      id: 'forecast-accuracy',
      name: 'Forecast Accuracy',
      value: 96.2,
      unit: '%',
      change: 2.1,
      status: 'healthy',
      threshold: 95,
      source: 'TimeLLM Model'
    },
    {
      id: 'inventory-turnover',
      name: 'Inventory Turnover',
      value: 8.4,
      unit: 'x',
      change: 0.7,
      status: 'healthy',
      threshold: 6,
      source: 'Inventory System'
    },
    {
      id: 'stockout-rate',
      name: 'Stockout Rate',
      value: 1.3,
      unit: '%',
      change: -0.8,
      status: 'warning',
      threshold: 2,
      source: 'Real-time Monitor'
    },
    {
      id: 'system-uptime',
      name: 'System Uptime',
      value: 99.97,
      unit: '%',
      change: 0.02,
      status: 'healthy',
      threshold: 99.9,
      source: 'AWS CloudWatch'
    }
  ]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 border-l-red-500';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 border-l-yellow-500';
      case 'info':
        return 'bg-blue-50 border-blue-200 border-l-blue-500';
      case 'success':
        return 'bg-green-50 border-green-200 border-l-green-500';
      default:
        return 'bg-gray-50 border-gray-200 border-l-gray-500';
    }
  };

  const getMetricStatus = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Real-time Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-600">{metric.name}</h4>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getMetricStatus(metric.status)}`}>
                {metric.status.toUpperCase()}
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-slate-800">
                {metric.value}{metric.unit}
              </span>
              <div className={`flex items-center space-x-1 text-sm ${
                metric.change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{Math.abs(metric.change)}{metric.unit}</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-500 mb-2">
              Threshold: {metric.threshold}{metric.unit} • {metric.source}
            </div>
            
            <div className="w-full bg-slate-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full ${
                  metric.status === 'healthy' ? 'bg-green-500' :
                  metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((metric.value / (metric.threshold * 1.2)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Management */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-slate-800">Real-time Alerts</h3>
            {unacknowledgedCount > 0 && (
              <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                {unacknowledgedCount} unacknowledged
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-4 rounded-xl border-l-4 border ${getAlertColor(alert.type)} ${
                alert.acknowledged ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-slate-800">{alert.title}</h4>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                        {alert.category}
                      </span>
                      {alert.actionRequired && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          ACTION REQUIRED
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
                    
                    {alert.metadata && (
                      <div className="text-xs text-slate-500 space-y-1">
                        {alert.metadata.productId && (
                          <div>Product: {alert.metadata.productId}</div>
                        )}
                        {alert.metadata.currentValue && alert.metadata.threshold && (
                          <div>
                            Current: {alert.metadata.currentValue} | Threshold: {alert.metadata.threshold}
                          </div>
                        )}
                        {alert.metadata.impact && (
                          <div className="font-medium">Impact: {alert.metadata.impact}</div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      <span>{alert.source}</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!alert.acknowledged && (
                    <button 
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.actionRequired && (
                    <button className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm">
                      Take Action
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AWS CloudWatch Integration */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">AWS Monitoring Services</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">CloudWatch</span>
            </div>
            <p className="text-sm text-blue-700 mb-2">Real-time metrics & logs</p>
            <div className="text-xs text-blue-600">847 active metrics</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <Zap className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Lambda Triggers</span>
            </div>
            <p className="text-sm text-green-700 mb-2">Automated alert actions</p>
            <div className="text-xs text-green-600">23 active functions</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="flex items-center space-x-3 mb-3">
              <Shield className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">EventBridge</span>
            </div>
            <p className="text-sm text-purple-700 mb-2">Event-driven automation</p>
            <div className="text-xs text-purple-600">156 events/hour</div>
          </div>
        </div>
      </div>
    </div>
  );
};