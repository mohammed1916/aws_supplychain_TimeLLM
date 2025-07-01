import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  Users,
  AlertTriangle,
  CheckCircle,
  Settings,
  FileText,
  Activity,
  Key,
  UserCheck,
  Zap,
  Brain,
  Scale
} from 'lucide-react';

interface AccessControl {
  userId: string;
  name: string;
  role: string;
  permissions: string[];
  lastAccess: string;
  status: 'active' | 'inactive' | 'suspended';
  department: string;
}

interface AIGovernanceMetric {
  id: string;
  name: string;
  value: number;
  threshold: number;
  status: 'compliant' | 'warning' | 'violation';
  description: string;
  lastChecked: string;
}

interface BiasDetection {
  id: string;
  modelComponent: string;
  biasType: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
  mitigation: string;
  status: 'detected' | 'mitigating' | 'resolved';
}

export const ResponsibleAI: React.FC = () => {
  const [activeTab, setActiveTab] = useState('governance');

  const accessControls: AccessControl[] = [
    {
      userId: 'usr-001',
      name: 'Sarah Chen',
      role: 'Supply Chain Manager',
      permissions: ['view_forecasts', 'manage_inventory', 'generate_reports'],
      lastAccess: '2024-01-15T09:30:00Z',
      status: 'active',
      department: 'Operations'
    },
    {
      userId: 'usr-002',
      name: 'Michael Rodriguez',
      role: 'Data Scientist',
      permissions: ['model_training', 'data_access', 'algorithm_tuning'],
      lastAccess: '2024-01-15T08:45:00Z',
      status: 'active',
      department: 'Analytics'
    },
    {
      userId: 'usr-003',
      name: 'Jennifer Park',
      role: 'Executive',
      permissions: ['executive_dashboard', 'strategic_reports', 'budget_approval'],
      lastAccess: '2024-01-14T16:20:00Z',
      status: 'active',
      department: 'Leadership'
    },
    {
      userId: 'usr-004',
      name: 'David Thompson',
      role: 'Auditor',
      permissions: ['audit_logs', 'compliance_reports', 'system_monitoring'],
      lastAccess: '2024-01-12T11:15:00Z',
      status: 'inactive',
      department: 'Compliance'
    }
  ];

  const governanceMetrics: AIGovernanceMetric[] = [
    {
      id: 'fairness',
      name: 'Model Fairness',
      value: 94.2,
      threshold: 90,
      status: 'compliant',
      description: 'Ensures equitable predictions across different product categories',
      lastChecked: '2024-01-15T10:00:00Z'
    },
    {
      id: 'transparency',
      name: 'Prediction Explainability',
      value: 87.5,
      threshold: 85,
      status: 'compliant',
      description: 'Measures how well model decisions can be explained',
      lastChecked: '2024-01-15T10:00:00Z'
    },
    {
      id: 'accuracy',
      name: 'Forecast Accuracy',
      value: 96.2,
      threshold: 95,
      status: 'compliant',
      description: 'Overall prediction accuracy across all product lines',
      lastChecked: '2024-01-15T10:00:00Z'
    },
    {
      id: 'robustness',
      name: 'Model Robustness',
      value: 82.1,
      threshold: 85,
      status: 'warning',
      description: 'Stability of predictions under data variations',
      lastChecked: '2024-01-15T10:00:00Z'
    }
  ];

  const biasDetections: BiasDetection[] = [
    {
      id: 'bias-001',
      modelComponent: 'Seasonal Adjustment Module',
      biasType: 'Temporal Bias',
      severity: 'low',
      detectedAt: '2024-01-14T14:30:00Z',
      mitigation: 'Applied temporal normalization and cross-validation',
      status: 'resolved'
    },
    {
      id: 'bias-002',
      modelComponent: 'Product Category Classifier',
      biasType: 'Category Imbalance',
      severity: 'medium',
      detectedAt: '2024-01-13T11:20:00Z',
      mitigation: 'Implementing balanced sampling and category weighting',
      status: 'mitigating'
    },
    {
      id: 'bias-003',
      modelComponent: 'Demand Forecasting Engine',
      biasType: 'Regional Bias',
      severity: 'high',
      detectedAt: '2024-01-12T16:45:00Z',
      mitigation: 'Regional data augmentation and fairness constraints applied',
      status: 'resolved'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'active':
      case 'resolved':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'inactive':
      case 'mitigating':
        return 'text-yellow-600 bg-yellow-100';
      case 'violation':
      case 'suspended':
      case 'detected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-slate-200">
        {[
          { id: 'governance', label: 'AI Governance', icon: Scale },
          { id: 'access', label: 'Access Control', icon: Lock },
          { id: 'monitoring', label: 'Bias Monitoring', icon: Eye },
          { id: 'compliance', label: 'Compliance', icon: FileText }
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

      {/* AI Governance Tab */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          {/* Governance Metrics */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">AI Governance Metrics</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">Powered by</span>
                <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full">
                  <span className="text-sm font-medium text-blue-700">AWS AI Fairness</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {governanceMetrics.map((metric) => (
                <div key={metric.id} className="p-4 bg-white/50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-600">{metric.name}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                      {metric.status.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl font-bold text-slate-800">{metric.value}%</span>
                      <span className="text-sm text-slate-500">≥{metric.threshold}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          metric.status === 'compliant' ? 'bg-green-500' :
                          metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((metric.value / 100) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-600 mb-2">{metric.description}</p>
                  <p className="text-xs text-slate-500">
                    Last checked: {new Date(metric.lastChecked).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Ethics Framework */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">AI Ethics Framework</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Transparency</span>
                </div>
                <p className="text-sm text-blue-700 mb-2">Model decisions are explainable</p>
                <div className="text-xs text-blue-600">LIME & SHAP integration active</div>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Scale className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Fairness</span>
                </div>
                <p className="text-sm text-green-700 mb-2">Equitable across all segments</p>
                <div className="text-xs text-green-600">Bias detection automated</div>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Accountability</span>
                </div>
                <p className="text-sm text-purple-700 mb-2">Full audit trail maintained</p>
                <div className="text-xs text-purple-600">Decision logging enabled</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Control Tab */}
      {activeTab === 'access' && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Role-Based Access Control (RBAC)</h3>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Users className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>

          <div className="space-y-4">
            {accessControls.map((user) => (
              <div key={user.userId} className="p-4 bg-white/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">{user.name}</h4>
                      <p className="text-sm text-slate-600">{user.role} • {user.department}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status.toUpperCase()}
                    </div>
                    <div className="text-sm text-slate-600">
                      Last access: {new Date(user.lastAccess).toLocaleDateString()}
                    </div>
                    <button className="px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm">
                      Manage
                    </button>
                  </div>
                </div>
                
                <div className="mt-3 pl-14">
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map((permission, index) => (
                      <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs">
                        {permission.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bias Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">AI Bias Detection & Mitigation</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Powered by</span>
              <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
                <span className="text-sm font-medium text-purple-700">AWS SageMaker Clarify</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {biasDetections.map((bias) => (
              <div key={bias.id} className="p-4 bg-white/50 rounded-xl border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      bias.severity === 'high' ? 'bg-red-100 text-red-600' :
                      bias.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-slate-800">{bias.modelComponent}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(bias.severity)}`}>
                          {bias.severity.toUpperCase()}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bias.status)}`}>
                          {bias.status.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Bias Type:</strong> {bias.biasType}
                      </p>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Detected:</strong> {new Date(bias.detectedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pl-11">
                  <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <p className="text-sm text-blue-800">
                      <strong>Mitigation Strategy:</strong> {bias.mitigation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Compliance Overview */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Regulatory Compliance</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-center space-x-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">GDPR Compliance</span>
                </div>
                <p className="text-sm text-green-700 mb-2">Data privacy & protection</p>
                <div className="text-xs text-green-600">Fully compliant</div>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">SOC 2 Type II</span>
                </div>
                <p className="text-sm text-blue-700 mb-2">Security & availability</p>
                <div className="text-xs text-blue-600">Certified</div>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="flex items-center space-x-3 mb-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">ISO 27001</span>
                </div>
                <p className="text-sm text-purple-700 mb-2">Information security</p>
                <div className="text-xs text-purple-600">In progress</div>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Audit Trail & Logging</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-100">
                <div className="flex items-center space-x-3">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-slate-800">Model prediction logged</span>
                </div>
                <span className="text-xs text-slate-500">2024-01-15 10:32:15</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-100">
                <div className="flex items-center space-x-3">
                  <Key className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-slate-800">User access granted: Sarah Chen</span>
                </div>
                <span className="text-xs text-slate-500">2024-01-15 09:30:42</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-100">
                <div className="flex items-center space-x-3">
                  <Settings className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-slate-800">Model parameters updated</span>
                </div>
                <span className="text-xs text-slate-500">2024-01-15 08:45:23</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AWS Security Services */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">AWS Security & Compliance Services</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="flex items-center space-x-3 mb-3">
              <Shield className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">IAM</span>
            </div>
            <p className="text-sm text-red-700 mb-2">Identity & access management</p>
            <div className="text-xs text-red-600">47 active policies</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
            <div className="flex items-center space-x-3 mb-3">
              <Eye className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">CloudTrail</span>
            </div>
            <p className="text-sm text-orange-700 mb-2">API call logging</p>
            <div className="text-xs text-orange-600">156K events logged</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <Lock className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">KMS</span>
            </div>
            <p className="text-sm text-green-700 mb-2">Key management service</p>
            <div className="text-xs text-green-600">Data encrypted at rest</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Config</span>
            </div>
            <p className="text-sm text-blue-700 mb-2">Compliance monitoring</p>
            <div className="text-xs text-blue-600">98.7% compliance score</div>
          </div>
        </div>
      </div>
    </div>
  );
};