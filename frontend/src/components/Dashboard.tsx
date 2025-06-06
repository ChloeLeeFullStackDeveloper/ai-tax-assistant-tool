import React from 'react';
import { MessageCircle, FileText, Calculator, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardProps {
  aiInsights: any[];
  uploadedFiles: any[];
  setActiveTab: (tab: string) => void;
  setShowChat: (show: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  aiInsights, 
  uploadedFiles, 
  setActiveTab, 
  setShowChat 
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tax Dashboard</h1>
        <p className="text-gray-600">Manage your Canadian tax preparation with AI assistance</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <button
          onClick={() => setShowChat(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <MessageCircle className="h-8 w-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">AI Tax Assistant</h3>
          <p className="text-sm opacity-90">Get instant answers to your Canadian tax questions</p>
        </button>

        <button
          onClick={() => setActiveTab('Calculator')}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Calculator className="h-8 w-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Tax Calculator</h3>
          <p className="text-sm opacity-90">Calculate your federal and provincial taxes</p>
        </button>

        <button
          onClick={() => setActiveTab('Documents')}
          className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <FileText className="h-8 w-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
          <p className="text-sm opacity-90">Upload T4, T5 slips and receipts</p>
        </button>

        <button
          onClick={() => setActiveTab('Tax Forms')}
          className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <BarChart3 className="h-8 w-8 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Tax Forms</h3>
          <p className="text-sm opacity-90">View and manage your tax forms</p>
        </button>
      </div>

      {/* AI Insights Section */}
      {aiInsights.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tax Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiInsights.map((insight) => (
              <div key={insight.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center mb-3">
                  {insight.type === 'optimization' && <TrendingUp className="h-5 w-5 text-green-600 mr-2" />}
                  {insight.type === 'opportunity' && <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />}
                  {insight.type === 'warning' && <AlertCircle className="h-5 w-5 text-red-600 mr-2" />}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                    insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {insight.impact} impact
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{insight.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{insight.description}</p>
                {insight.estimatedSavings && (
                  <div className="text-green-600 font-semibold">
                    Potential savings: ${insight.estimatedSavings.toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
          {uploadedFiles.length > 0 ? (
            <div className="space-y-3">
              {uploadedFiles.slice(0, 5).map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(file.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {file.aiScore && (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      file.aiScore >= 90 ? 'bg-green-100 text-green-800' :
                      file.aiScore >= 80 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {file.aiScore}% confidence
                    </span>
                  )}
                </div>
              ))}
              {uploadedFiles.length > 5 && (
                <button
                  onClick={() => setActiveTab('Documents')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View all {uploadedFiles.length} documents →
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No documents uploaded yet</p>
              <button
                onClick={() => setActiveTab('Documents')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Documents
              </button>
            </div>
          )}
        </div>

        {/* Getting Started Guide */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="ml-4">
                <p className="font-medium text-gray-900">Upload your tax documents</p>
                <p className="text-sm text-gray-500">T4, T5 slips and receipts</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="ml-4">
                <p className="font-medium text-gray-900">Calculate your taxes</p>
                <p className="text-sm text-gray-500">Get federal and provincial estimates</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div className="ml-4">
                <p className="font-medium text-gray-900">Chat with AI Assistant</p>
                <p className="text-sm text-gray-500">Get answers to tax questions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;