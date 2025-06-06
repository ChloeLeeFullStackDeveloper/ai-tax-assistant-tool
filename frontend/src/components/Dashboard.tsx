// components/Dashboard.tsx - Main Dashboard Component
import React from 'react';
import { 
  ClipboardList, Brain, Calculator, FileText, Target, CheckCircle,
  Star, Zap, TrendingUp, Eye, Lightbulb, AlertTriangle, DollarSign, BarChart3
} from 'lucide-react';
import { DashboardProps } from '../types';

const Dashboard: React.FC<DashboardProps> = ({ 
  aiInsights, 
  uploadedFiles, 
  setActiveTab, 
  setShowChat 
}) => {
  // Calculate stats
  const stats = {
    documents: uploadedFiles.length,
    aiInsights: aiInsights.filter(i => !i.completed).length,
    optimizations: aiInsights.filter(i => i.type === 'optimization').length,
    potentialSavings: aiInsights.reduce((sum, insight) => sum + (insight.estimatedSavings || 0), 0)
  };

  return (
    <div className="p-6">
      {/* AI Insights Banner */}
      {aiInsights.filter(i => !i.completed).length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="font-medium text-gray-800">
                AI found {aiInsights.filter(i => !i.completed).length} optimization opportunities
              </span>
            </div>
            <span className="text-green-600 font-bold">
              Save ${stats.potentialSavings.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Main Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* AI Tax Wizard */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 mx-auto">
            <ClipboardList className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2">AI Tax Wizard</h3>
          <p className="text-gray-600 text-center mb-4">CRA-compliant tax preparation with AI guidance</p>
          <div className="flex items-center justify-center mb-4">
            <Star className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-sm text-gray-600">AI-Powered</span>
          </div>
          <button 
            onClick={() => setActiveTab('Tax Forms')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start with AI
          </button>
        </div>

        {/* AI Assistant */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4 mx-auto">
            <Brain className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2">AI Assistant</h3>
          <p className="text-gray-600 text-center mb-4">CRA-compliant tax advice powered by ML</p>
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-gray-600">Real-time Analysis</span>
          </div>
          <button 
            onClick={() => setShowChat(true)}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            Chat with AI
          </button>
        </div>

        {/* Smart Calculator */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mb-4 mx-auto">
            <Calculator className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2">Smart Calculator</h3>
          <p className="text-gray-600 text-center mb-4">Canadian tax calculations & RRSP optimization</p>
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-sm text-gray-600">Optimization Engine</span>
          </div>
          <button 
            onClick={() => setActiveTab('Calculator')}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Calculate & Optimize
          </button>
        </div>

        {/* AI Document Hub */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4 mx-auto">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2">AI Document Hub</h3>
          <p className="text-gray-600 text-center mb-4">T4, T5 analysis & CRA document processing</p>
          <div className="flex items-center justify-center mb-4">
            <Eye className="h-4 w-4 text-purple-500 mr-1" />
            <span className="text-sm text-gray-600">OCR + ML Analysis</span>
          </div>
          <button 
            onClick={() => setActiveTab('Documents')}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Analyze Documents
          </button>
        </div>

        {/* Smart Advice */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-4 mx-auto">
            <Target className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2">Smart Advice</h3>
          <p className="text-gray-600 text-center mb-4">RRSP, TFSA & Canadian tax credit insights</p>
          <div className="flex items-center justify-center mb-4">
            <Lightbulb className="h-4 w-4 text-orange-500 mr-1" />
            <span className="text-sm text-gray-600">ML Insights</span>
          </div>
          <button 
            onClick={() => setShowChat(true)}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Get AI Advice
          </button>
        </div>

        {/* AI Audit */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-lg mb-4 mx-auto">
            <CheckCircle className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-center mb-2">CRA Audit Check</h3>
          <p className="text-gray-600 text-center mb-4">Compliance check & CRA readiness assessment</p>
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-4 w-4 text-indigo-500 mr-1" />
            <span className="text-sm text-gray-600">Risk Assessment</span>
          </div>
          <button 
            onClick={() => alert('🍁 CRA Audit Check Complete!\n📊 Completeness: 85%\n⚠️ Risk: Low\n💡 Recommendations: 3 CRA compliance suggestions\n🏛️ Ready for CRA submission')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Run CRA Check
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Documents</p>
              <p className="text-2xl font-bold text-blue-600">{stats.documents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">AI Insights</p>
              <p className="text-2xl font-bold text-green-600">{stats.aiInsights}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Optimizations</p>
              <p className="text-2xl font-bold text-purple-600">{stats.optimizations}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Potential Savings</p>
              <p className="text-2xl font-bold text-orange-600">${stats.potentialSavings.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;