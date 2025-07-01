import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Filter,
  PieChart,
  LineChart,
  Users,
  DollarSign,
  Package,
  Clock,
  Target,
  Award
} from 'lucide-react';

interface ReportData {
  id: string;
  name: string;
  type: 'executive' | 'operational' | 'financial' | 'compliance';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastGenerated: string;
  status: 'ready' | 'generating' | 'scheduled';
  recipients: string[];
  kpis: {
    name: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'stable';
  }[];
}

interface AnalyticsInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'demand' | 'inventory' | 'cost' | 'efficiency';
  confidence: number;
  recommendation: string;
  potentialSavings?: number;
}

export const ReportingAnalytics: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('monthly');
  const [selectedReport, setSelectedReport] = useState('executive');

  const reports: ReportData[] = [
    {
      id: 'exec-dashboard',
      name: 'Executive Dashboard',
      type: 'executive',
      frequency: 'weekly',
      lastGenerated: '2024-01-15T08:00:00Z',
      status: 'ready',
      recipients: ['ceo@company.com', 'coo@company.com'],
      kpis: [
        { name: 'Revenue Impact', value: '$2.4M', change: '+12.5%', trend: 'up' },
        { name: 'Cost Savings', value: '$340K', change: '+23.1%', trend: 'up' },
        { name: 'Forecast Accuracy', value: '96.2%', change: '+2.1%', trend: 'up' },
        { name: 'Inventory Efficiency', value: '94.7%', change: '+5.3%', trend: 'up' }
      ]
    },
    {
      id: 'ops-report',
      name: 'Operations Report',
      type: 'operational',
      frequency: 'daily',
      lastGenerated: '2024-01-15T06:00:00Z',
      status: 'ready',
      recipients: ['ops@company.com', 'supply@company.com'],
      kpis: [
        { name: 'Order Fulfillment', value: '98.3%', change: '+1.2%', trend: 'up' },
        { name: 'Stockout Rate', value: '1.3%', change: '-0.8%', trend: 'down' },
        { name: 'Inventory Turnover', value: '8.4x', change: '+0.7x', trend: 'up' },
        { name: 'Lead Time Variance', value: '2.1 days', change: '-0.5 days', trend: 'down' }
      ]
    },
    {
      id: 'financial-analysis',
      name: 'Financial Analysis',
      type: 'financial',
      frequency: 'monthly',
      lastGenerated: '2024-01-01T00:00:00Z',
      status: 'generating',
      recipients: ['cfo@company.com', 'finance@company.com'],
      kpis: [
        { name: 'Carrying Cost', value: '$2.1M', change: '-$340K', trend: 'down' },
        { name: 'Working Capital', value: '$8.7M', change: '-$1.2M', trend: 'down' },
        { name: 'ROI on Inventory', value: '24.3%', change: '+3.8%', trend: 'up' },
        { name: 'Cost per Unit', value: '$12.45', change: '-$0.87', trend: 'down' }
      ]
    }
  ];

  const analyticsInsights: AnalyticsInsight[] = [
    {
      id: 'insight-001',
      title: 'Seasonal Demand Pattern Identified',
      description: 'TimeLLM detected a 35% increase in wireless headphone demand during Q4, with peak occurring in November.',
      impact: 'high',
      category: 'demand',
      confidence: 94.2,
      recommendation: 'Increase procurement by 40% starting September to avoid stockouts.',
      potentialSavings: 125000
    },
    {
      id: 'insight-002',
      title: 'Inventory Optimization Opportunity',
      description: 'Analysis shows 15% of current inventory consists of slow-moving items with less than 2 turns per year.',
      impact: 'medium',
      category: 'inventory',
      confidence: 87.6,
      recommendation: 'Implement clearance strategy for slow-moving items and reduce safety stock.',
      potentialSavings: 89000
    },
    {
      id: 'insight-003',
      title: 'Supplier Performance Variance',
      description: 'Supplier ABC Corp shows 12% higher lead time variance compared to industry benchmark.',
      impact: 'medium',
      category: 'efficiency',
      confidence: 91.3,
      recommendation: 'Diversify supplier base or negotiate improved SLAs with current supplier.'
    },
    {
      id: 'insight-004',
      title: 'Cost Reduction Through Consolidation',
      description: 'Warehouse consolidation analysis shows potential 18% reduction in storage costs.',
      impact: 'high',
      category: 'cost',
      confidence: 89.7,
      recommendation: 'Consolidate inventory from 3 regional warehouses to 2 strategic locations.',
      potentialSavings: 156000
    }
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'demand': return <TrendingUp className="w-4 h-4" />;
      case 'inventory': return <Package className="w-4 h-4" />;
      case 'cost': return <DollarSign className="w-4 h-4" />;
      case 'efficiency': return <Target className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const selectedReportData = reports.find(r => r.id === selectedReport);

  return (
    <div className="space-y-6">
      {/* Report Selection and Controls */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Analytics & Reporting</h3>
          <div className="flex items-center space-x-3">
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Report Tabs */}
        <div className="flex space-x-1 mb-6 bg-slate-100 rounded-lg p-1">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`flex-1 px-4 py-2 rounded-md transition-all duration-200 ${
                selectedReport === report.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {report.name}
            </button>
          ))}
        </div>

        {/* Selected Report KPIs */}
        {selectedReportData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedReportData.kpis.map((kpi, index) => (
              <div key={index} className="p-4 bg-white/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">{kpi.name}</span>
                  <div className={`flex items-center space-x-1 text-xs ${
                    kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-slate-600'
                  }`}>
                    {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
                     kpi.trend === 'down' ? <TrendingUp className="w-3 h-3 rotate-180" /> : 
                     <div className="w-3 h-0.5 bg-slate-400"></div>}
                    <span>{kpi.change}</span>
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-800">{kpi.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI-Powered Insights */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-slate-800">TimeLLM Analytics Insights</h3>
            <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full">
              <span className="text-sm font-medium text-blue-700">AI-Powered</span>
            </div>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter Insights</span>
          </button>
        </div>

        <div className="space-y-4">
          {analyticsInsights.map((insight) => (
            <div key={insight.id} className="p-4 bg-white/50 rounded-xl border border-slate-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    insight.category === 'demand' ? 'bg-blue-100 text-blue-600' :
                    insight.category === 'inventory' ? 'bg-green-100 text-green-600' :
                    insight.category === 'cost' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {getCategoryIcon(insight.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-slate-800">{insight.title}</h4>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(insight.impact)}`}>
                        {insight.impact.toUpperCase()} IMPACT
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{insight.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span>Confidence: {insight.confidence}%</span>
                      <span>Category: {insight.category}</span>
                      {insight.potentialSavings && (
                        <span className="text-green-600 font-medium">
                          Potential Savings: ${insight.potentialSavings.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  View Details
                </button>
              </div>
              
              <div className="pl-11">
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800">
                    <strong>Recommendation:</strong> {insight.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AWS Analytics Services */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">AWS Analytics & BI Services</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
            <div className="flex items-center space-x-3 mb-3">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">QuickSight</span>
            </div>
            <p className="text-sm text-orange-700 mb-2">Interactive dashboards</p>
            <div className="text-xs text-orange-600">47 active dashboards</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <PieChart className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Athena</span>
            </div>
            <p className="text-sm text-green-700 mb-2">SQL analytics on S3</p>
            <div className="text-xs text-green-600">2.3TB data analyzed</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="flex items-center space-x-3 mb-3">
              <LineChart className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">Redshift</span>
            </div>
            <p className="text-sm text-purple-700 mb-2">Data warehouse</p>
            <div className="text-xs text-purple-600">156M records processed</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <Award className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">SageMaker</span>
            </div>
            <p className="text-sm text-blue-700 mb-2">ML model insights</p>
            <div className="text-xs text-blue-600">TimeLLM active</div>
          </div>
        </div>
      </div>

      {/* Automated Reporting Schedule */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Automated Report Schedule</h3>
        
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  report.status === 'ready' ? 'bg-green-500' :
                  report.status === 'generating' ? 'bg-blue-500 animate-pulse' :
                  'bg-yellow-500'
                }`}></div>
                <div>
                  <h4 className="font-medium text-slate-800">{report.name}</h4>
                  <p className="text-sm text-slate-600">
                    {report.frequency} • Last: {new Date(report.lastGenerated).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-slate-600">
                  {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                </div>
                <button className="px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm">
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};