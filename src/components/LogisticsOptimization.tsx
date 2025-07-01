import React, { useState } from 'react';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  DollarSign,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Route,
  Warehouse
} from 'lucide-react';

interface OptimizationScenario {
  id: string;
  name: string;
  type: 'inventory' | 'routing' | 'warehouse' | 'supplier';
  status: 'optimizing' | 'completed' | 'pending';
  savings: number;
  efficiency: number;
  recommendations: string[];
}

interface InventoryOptimization {
  productId: string;
  productName: string;
  currentStock: number;
  optimalStock: number;
  reorderPoint: number;
  leadTime: number;
  demandForecast: number[];
  costSavings: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export const LogisticsOptimization: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState('inventory');
  
  const optimizationScenarios: OptimizationScenario[] = [
    {
      id: 'inventory',
      name: 'Inventory Optimization',
      type: 'inventory',
      status: 'completed',
      savings: 340000,
      efficiency: 23.5,
      recommendations: [
        'Reduce safety stock for high-turnover items by 15%',
        'Implement dynamic reorder points based on seasonal patterns',
        'Consolidate slow-moving inventory across warehouses'
      ]
    },
    {
      id: 'routing',
      name: 'Route Optimization',
      type: 'routing',
      status: 'optimizing',
      savings: 125000,
      efficiency: 18.2,
      recommendations: [
        'Optimize delivery routes using real-time traffic data',
        'Implement zone-based delivery scheduling',
        'Reduce average delivery time by 12 minutes'
      ]
    },
    {
      id: 'warehouse',
      name: 'Warehouse Layout',
      type: 'warehouse',
      status: 'pending',
      savings: 89000,
      efficiency: 15.7,
      recommendations: [
        'Reorganize high-velocity items closer to shipping',
        'Implement automated picking systems',
        'Optimize storage density by 20%'
      ]
    }
  ];

  const inventoryOptimizations: InventoryOptimization[] = [
    {
      productId: 'WH-001',
      productName: 'Wireless Headphones Pro',
      currentStock: 2340,
      optimalStock: 1850,
      reorderPoint: 450,
      leadTime: 14,
      demandForecast: [120, 135, 142, 158, 165, 172],
      costSavings: 45600,
      riskLevel: 'low'
    },
    {
      productId: 'SW-002',
      productName: 'Smart Watch Series X',
      currentStock: 150,
      optimalStock: 380,
      reorderPoint: 120,
      leadTime: 21,
      demandForecast: [85, 92, 98, 105, 112, 118],
      costSavings: -23400,
      riskLevel: 'high'
    },
    {
      productId: 'LC-003',
      productName: 'Laptop Charger USB-C',
      currentStock: 890,
      optimalStock: 720,
      reorderPoint: 200,
      leadTime: 7,
      demandForecast: [95, 88, 92, 87, 90, 94],
      costSavings: 12800,
      riskLevel: 'medium'
    }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'optimizing': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Optimization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {optimizationScenarios.map((scenario) => (
          <div 
            key={scenario.id}
            className={`bg-white/70 backdrop-blur-sm rounded-2xl p-6 border cursor-pointer transition-all duration-200 ${
              activeScenario === scenario.id 
                ? 'border-blue-300 shadow-lg shadow-blue-500/10' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setActiveScenario(scenario.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {scenario.type === 'inventory' && <Package className="w-5 h-5 text-blue-600" />}
                {scenario.type === 'routing' && <Route className="w-5 h-5 text-green-600" />}
                {scenario.type === 'warehouse' && <Warehouse className="w-5 h-5 text-purple-600" />}
                <h3 className="font-semibold text-slate-800">{scenario.name}</h3>
              </div>
              {getStatusIcon(scenario.status)}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Potential Savings</span>
                <span className="font-bold text-green-600">${scenario.savings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Efficiency Gain</span>
                <span className="font-bold text-blue-600">+{scenario.efficiency}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${scenario.efficiency * 3}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Optimization View */}
      {activeScenario === 'inventory' && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">TimeLLM Inventory Optimization</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Powered by</span>
              <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full">
                <span className="text-sm font-medium text-blue-700">AWS SageMaker + TimeLLM</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {inventoryOptimizations.map((item) => (
              <div key={item.productId} className="p-4 bg-white/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">{item.productName}</h4>
                      <p className="text-sm text-slate-600">SKU: {item.productId}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(item.riskLevel)}`}>
                    {item.riskLevel.toUpperCase()} RISK
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-1">Current Stock</p>
                    <p className="font-semibold text-slate-800">{item.currentStock}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-1">Optimal Stock</p>
                    <p className="font-semibold text-blue-600">{item.optimalStock}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-1">Reorder Point</p>
                    <p className="font-semibold text-orange-600">{item.reorderPoint}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-1">Lead Time</p>
                    <p className="font-semibold text-slate-800">{item.leadTime} days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-1">Cost Impact</p>
                    <p className={`font-semibold ${item.costSavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.costSavings > 0 ? '+' : ''}${item.costSavings.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="text-slate-600">6-Month Forecast: </span>
                      <span className="font-medium text-slate-800">
                        {item.demandForecast.join(' → ')} units/month
                      </span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Apply Optimization
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AWS Services Integration */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">AWS Optimization Services</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
            <div className="flex items-center space-x-3 mb-3">
              <Truck className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">Route Optimization</span>
            </div>
            <p className="text-sm text-orange-700 mb-2">AWS Location Service</p>
            <div className="text-xs text-orange-600">12% delivery time reduction</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Cost Optimization</span>
            </div>
            <p className="text-sm text-green-700 mb-2">AWS Cost Explorer</p>
            <div className="text-xs text-green-600">$340K annual savings</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="flex items-center space-x-3 mb-3">
              <MapPin className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">Demand Planning</span>
            </div>
            <p className="text-sm text-purple-700 mb-2">SageMaker + TimeLLM</p>
            <div className="text-xs text-purple-600">96.2% forecast accuracy</div>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingDown className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Risk Mitigation</span>
            </div>
            <p className="text-sm text-blue-700 mb-2">CloudWatch + Lambda</p>
            <div className="text-xs text-blue-600">Real-time monitoring</div>
          </div>
        </div>
      </div>
    </div>
  );
};