// components/Profile.tsx - User Profile Management
import React from 'react';
import { User, Brain, TrendingUp, DollarSign } from 'lucide-react';
import { ProfileProps } from '../types';

const Profile: React.FC<ProfileProps> = ({
  user,
  uploadedFiles,
  aiInsights,
  setIsLoading
}) => {

  // Calculate stats
  const stats = {
    documents: uploadedFiles.length,
    potentialSavings: aiInsights.reduce((sum, insight) => sum + (insight.estimatedSavings || 0), 0),
    aiInsights: aiInsights.filter(i => !i.completed).length,
    accuracyScore: 94 // Mock accuracy score
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('✅ Profile updated successfully!');
    } catch (err) {
      console.error('Profile update error:', err);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">User Profile</h2>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{user?.name || 'John Doe'}</h3>
              <p className="text-gray-600">{user?.email || 'john.doe@email.com'}</p>
              <p className="text-sm text-blue-600">Premium AI Member</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name || 'John Doe'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                defaultValue={user?.email || 'john.doe@email.com'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                defaultValue={user?.phone || '+1 (555) 123-4567'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Year</label>
              <select
                defaultValue="2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4">AI Usage Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.documents}</p>
                <p className="text-sm text-gray-600">Documents Analyzed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">${stats.potentialSavings.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Savings Found</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.aiInsights}</p>
                <p className="text-sm text-gray-600">AI Recommendations</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.accuracyScore}%</p>
                <p className="text-sm text-gray-600">AI Accuracy Score</p>
              </div>
            </div>
          </div>

          {/* Canadian Tax Profile Section */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4">🍁 Canadian Tax Profile</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Province/Territory</label>
                <select
                  defaultValue="ontario"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ontario">Ontario</option>
                  <option value="quebec">Quebec</option>
                  <option value="british_columbia">British Columbia</option>
                  <option value="alberta">Alberta</option>
                  <option value="manitoba">Manitoba</option>
                  <option value="saskatchewan">Saskatchewan</option>
                  <option value="nova_scotia">Nova Scotia</option>
                  <option value="new_brunswick">New Brunswick</option>
                  <option value="newfoundland">Newfoundland and Labrador</option>
                  <option value="pei">Prince Edward Island</option>
                  <option value="northwest_territories">Northwest Territories</option>
                  <option value="nunavut">Nunavut</option>
                  <option value="yukon">Yukon</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Income Source</label>
                <select
                  defaultValue="employment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="employment">Employment (T4)</option>
                  <option value="self_employment">Self-Employment</option>
                  <option value="investment">Investment Income</option>
                  <option value="pension">Pension Income</option>
                  <option value="rental">Rental Income</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <button 
            onClick={handleUpdateProfile}
            className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Update Profile
          </button>
        </div>

        {/* AI Insights Summary */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Brain className="h-5 w-5 text-blue-600 mr-2" />
            AI Tax Optimization Summary
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium">🍁 CRA Compliance Score:</span>
              <span className="text-lg font-bold text-green-600">94%</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">💰 RRSP Optimization Potential:</span>
              <span className="text-lg font-bold text-blue-600">$5,680</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="font-medium">🏠 TFSA Room Available:</span>
              <span className="text-lg font-bold text-purple-600">$7,000</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="font-medium">📊 Estimated Tax Savings:</span>
              <span className="text-lg font-bold text-orange-600">${stats.potentialSavings.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-orange-800 mb-2">🎯 Next Steps for Tax Optimization</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Complete RRSP contribution before deadline</li>
              <li>• Upload remaining T4/T5 slips for accuracy</li>
              <li>• Review home office expense eligibility</li>
              <li>• Consider tax-loss harvesting for investments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;