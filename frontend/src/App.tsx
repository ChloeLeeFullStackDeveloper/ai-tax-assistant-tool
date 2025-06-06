import React, { useState, useEffect } from 'react';
import { 
  Calculator, FileText, User, Brain, BarChart3, ClipboardList, 
  MessageCircle, RefreshCw, X, AlertCircle, Shield, MapPin
} from 'lucide-react';

import AuthModal from './components/AuthModal';
import ChatModal from './components/ChatModal';
import Dashboard from './components/Dashboard';
import Documents from './components/Documents';
import TaxForms from './components/TaxForms';
import TaxCalculator from './components/TaxCalculator';
import Profile from './components/Profile';
import { User as UserType, TaxFormData, ChatMessage, UploadedFile, AIInsight } from './types';
import { ChatModalProps } from './types';

type ActiveTab = 'Dashboard' | 'Documents' | 'Tax Forms' | 'Calculator' | 'Profile';

interface Province {
  code: string;
  name: string;
  basicPersonal: number;
  salesTax: string;
}

const App: React.FC = () => {

  const [user, setUser] = useState<UserType | null>(null);
  const [showLogin, setShowLogin] = useState<boolean>(!localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<ActiveTab>('Dashboard');
  const [showChat, setShowChat] = useState<boolean>(false);
  
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('ON');
  const [showProvinceSelector, setShowProvinceSelector] = useState<boolean>(false);
  
  const [taxFormData, setTaxFormData] = useState<TaxFormData>({
    income: '',
    deductions: '15705',
    filingStatus: 'single',
    taxYear: '2024'
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: 'bot',
      message: "Hello! I'm your Canadian AI Tax Assistant. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 95,
      aiInsight: true
    }
  ]);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<UploadedFile | null>(null);

  const [aiInsights, setAiInsights] = useState<AIInsight[]>([
    {
      id: '1',
      type: 'optimization',
      title: 'Maximize RRSP Contribution',
      description: 'You can save $3,420 by maximizing your RRSP contribution to the $31,560 limit',
      impact: 'high',
      estimatedSavings: 3420,
      completed: false
    },
    {
      id: '2',
      type: 'opportunity',
      title: 'TFSA Contribution Room',
      description: 'Use your $7,000 TFSA contribution room for tax-free growth',
      impact: 'medium',
      estimatedSavings: 1800,
      completed: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'Missing T4 Slip',
      description: 'Upload your T4 slip from CRA to ensure accurate tax calculations',
      impact: 'high',
      completed: false
    }
  ]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setUser({ id: '1', name: 'John Doe', email: 'john.doe@example.com' });
      setShowLogin(false);
    }
    
    fetchProvinces();
    const savedProvince = localStorage.getItem('userProvince');
    if (savedProvince) {
      setSelectedProvince(savedProvince);
    }
  }, []);

  const fetchProvinces = async (): Promise<void> => {
    try {
      const response = await fetch('http://localhost:3001/api/provinces');
      const data = await response.json();
      if (data.success) {
        setProvinces(data.data);
      } else {
        setProvinces([
          { code: 'ON', name: 'Ontario', basicPersonal: 11865, salesTax: 'HST: 13%' },
          { code: 'BC', name: 'British Columbia', basicPersonal: 11980, salesTax: 'GST: 5% + PST: 7%' },
          { code: 'AB', name: 'Alberta', basicPersonal: 21003, salesTax: 'GST: 5%' },
          { code: 'QC', name: 'Quebec', basicPersonal: 18056, salesTax: 'GST: 5% + QST: 9.975%' },
          { code: 'MB', name: 'Manitoba', basicPersonal: 15000, salesTax: 'GST: 5% + PST: 7%' },
          { code: 'SK', name: 'Saskatchewan', basicPersonal: 17661, salesTax: 'GST: 5% + PST: 6%' },
          { code: 'NB', name: 'New Brunswick', basicPersonal: 12458, salesTax: 'HST: 15%' },
          { code: 'NS', name: 'Nova Scotia', basicPersonal: 8744, salesTax: 'HST: 15%' },
          { code: 'PE', name: 'Prince Edward Island', basicPersonal: 12500, salesTax: 'HST: 15%' },
          { code: 'NL', name: 'Newfoundland and Labrador', basicPersonal: 10382, salesTax: 'HST: 15%' },
          { code: 'YT', name: 'Yukon', basicPersonal: 15705, salesTax: 'GST: 5%' },
          { code: 'NT', name: 'Northwest Territories', basicPersonal: 16593, salesTax: 'GST: 5%' },
          { code: 'NU', name: 'Nunavut', basicPersonal: 18767, salesTax: 'GST: 5%' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching provinces:', error);
      setProvinces([
        { code: 'ON', name: 'Ontario', basicPersonal: 11865, salesTax: 'HST: 13%' },
        { code: 'BC', name: 'British Columbia', basicPersonal: 11980, salesTax: 'GST: 5% + PST: 7%' },
        { code: 'AB', name: 'Alberta', basicPersonal: 21003, salesTax: 'GST: 5%' },
        { code: 'QC', name: 'Quebec', basicPersonal: 18056, salesTax: 'GST: 5% + QST: 9.975%' }
      ]);
    }
  };

  const handleProvinceChange = async (provinceCode: string): Promise<void> => {
    setSelectedProvince(provinceCode);
    localStorage.setItem('userProvince', provinceCode);
    setShowProvinceSelector(false);
    
    const selectedProvinceData = provinces.find(p => p.code === provinceCode);
    if (selectedProvinceData) {
      setTaxFormData(prev => ({
        ...prev,
        deductions: selectedProvinceData.basicPersonal.toString()
      }));
    }
    
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const response = await fetch('http://localhost:3001/api/user/province', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ province: provinceCode })
        });
        
        if (!response.ok) {
          console.warn('Could not save province preference');
        }
      } catch (error) {
        console.error('Error updating province:', error);
      }
    }
  };

  const getProvinceFlag = (code: string): string => {
    const flags: Record<string, string> = {
      'ON': '🍁', 'BC': '🏔️', 'AB': '⛽', 'SK': '🌾', 'MB': '🦬',
      'QC': '⚜️', 'NB': '🦞', 'NS': '🦞', 'PE': '🥔', 'NL': '🐟',
      'YT': '❄️', 'NT': '💎', 'NU': '🐻‍❄️'
    };
    return flags[code] || '🍁';
  };

  // Get current province name
  const getCurrentProvinceName = (): string => {
    return provinces.find(p => p.code === selectedProvince)?.name || 'Ontario';
  };

  // Authentication handlers
  const handleLogin = async (loginData: { email: string; password: string }) => {
    setIsLoading(true);
    setError('');
    try {
      setUser({ id: '1', name: 'John Doe', email: loginData.email });
      localStorage.setItem('authToken', 'demo_token');
      setShowLogin(false);
    } catch (err: any) {
      setError('Login failed. Please try again.');
    }
    setIsLoading(false);
  };

  const handleRegister = async (registerData: any) => {
    setIsLoading(true);
    setError('');
    try {
      setUser({ id: '1', name: registerData.name, email: registerData.email });
      localStorage.setItem('authToken', 'demo_token');
      setShowLogin(false);
    } catch (err: any) {
      setError('Registration failed. Please try again.');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userProvince');
    setUser(null);
    setShowLogin(true);
    setSelectedProvince('ON');
    setAiInsights([]);
    setUploadedFiles([]);
    setChatMessages([{
      type: 'bot',
      message: "Hello! I'm your Canadian AI Tax Assistant. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 95,
      aiInsight: true
    }]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showLogin && (
        <AuthModal
          onLogin={handleLogin}
          onRegister={handleRegister}
          isLoading={isLoading}
          error={error}
          setError={setError}
        />
      )}

      {showProvinceSelector && user && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowProvinceSelector(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Select Your Province</h2>
                </div>
                <button
                  onClick={() => setShowProvinceSelector(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {provinces.map((province) => (
                  <button
                    key={province.code}
                    onClick={() => handleProvinceChange(province.code)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md ${
                      selectedProvince === province.code
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getProvinceFlag(province.code)}</span>
                      <div>
                        <div className="font-medium">{province.name}</div>
                        <div className="text-sm text-gray-500">
                          Basic Personal: ${province.basicPersonal.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{province.salesTax}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getProvinceFlag(selectedProvince)}</span>
                  <span className="font-medium text-gray-900">
                    Current: {getCurrentProvinceName()}
                  </span>
                </div>
                <button
                  onClick={() => setShowProvinceSelector(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-white mr-3" />
              <h1 className="text-2xl font-bold text-white">Tax Prep AI</h1>
              <span className="ml-3 text-xs bg-white bg-opacity-20 text-white px-2 py-1 rounded-full">
                🍁 Canadian CRA
              </span>
            </div>
            
            {user && (
              <>
                <nav className="flex space-x-1">
                  {[
                    { id: 'Dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'Tax Forms', label: 'Tax Forms', icon: ClipboardList },
                    { id: 'Calculator', label: 'Calculator', icon: Calculator },
                    { id: 'Documents', label: 'Documents', icon: FileText },
                    { id: 'Profile', label: 'Profile', icon: User }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as ActiveTab)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-white bg-opacity-20 text-white'
                          : 'text-purple-100 hover:text-white hover:bg-white hover:bg-opacity-10'
                      }`}
                      disabled={isLoading}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>

                <div className="flex items-center gap-4">
                  {/* Province Selector Button - Fixed click handler */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowProvinceSelector(true);
                    }}
                    className="bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg hover:bg-opacity-30 transition-colors flex items-center gap-2"
                    disabled={isLoading}
                    title={`Current province: ${getCurrentProvinceName()}`}
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-lg">{getProvinceFlag(selectedProvince)}</span>
                    <span className="hidden sm:inline">{selectedProvince}</span>
                  </button>

                  <button
                    onClick={() => setShowChat(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <MessageCircle className="h-8 w-8 mb-3" />
                    <h3 className="text-lg font-semibold mb-2">🍁 AI Tax Assistant</h3>
                    <p className="text-sm opacity-90">Get instant Canadian tax advice and calculations</p>
                  </button>
                  <div className="text-white text-sm">
                    Welcome, {user?.name || 'User'}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg hover:bg-opacity-30 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Province Banner */}
      {user && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getProvinceFlag(selectedProvince)}</span>
                <span className="text-blue-800 text-sm">
                  Tax calculations for <strong>{getCurrentProvinceName()}</strong>
                </span>
              </div>
              <button
                onClick={() => setShowProvinceSelector(true)}
                className="text-blue-600 hover:text-blue-700 text-sm underline"
              >
                Change Province
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show if authenticated */}
      {user && (
        <main>
          {/* Loading Overlay */}
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
              <div className="bg-white rounded-lg p-6 flex items-center gap-3">
                <RefreshCw className="animate-spin h-6 w-6 text-blue-600" />
                <span className="text-gray-700">Processing...</span>
              </div>
            </div>
          )}

         {/* Error Banner */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
                <button 
                  onClick={() => setError('')}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Render Components Based on Active Tab */}
          {activeTab === 'Dashboard' && (
            <Dashboard 
              aiInsights={aiInsights}
              uploadedFiles={uploadedFiles}
              setActiveTab={(tab: string) => setActiveTab(tab as ActiveTab)}
              setShowChat={setShowChat}
            />
          )}

          {activeTab === 'Documents' && (
            <Documents
              uploadedFiles={uploadedFiles}
              setUploadedFiles={setUploadedFiles}
              selectedDocument={selectedDocument}
              setSelectedDocument={setSelectedDocument}
              setError={setError}
              setIsLoading={setIsLoading}
            />
          )}

          {activeTab === 'Tax Forms' && (
            <TaxForms
              taxFormData={taxFormData}
              setTaxFormData={setTaxFormData}
              setError={setError}
              setIsLoading={setIsLoading}
            />
          )}

          {activeTab === 'Calculator' && (
            <TaxCalculator
            selectedProvince={selectedProvince}
            setSelectedProvince={handleProvinceChange}
          />
          
          )}

          {activeTab === 'Profile' && (
            <Profile
              user={user}
              uploadedFiles={uploadedFiles}
              aiInsights={aiInsights}
              setIsLoading={setIsLoading}
            />
          )}
        </main>
      )}

      {/* Chat Modal */}
      {showChat && user && (
        <ChatModal
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          setShowChat={setShowChat} 
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          activeTab={activeTab}
          taxFormData={taxFormData}
          uploadedFiles={uploadedFiles}
          selectedProvince={selectedProvince}
        />
      )}
      
      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Brain className="h-6 w-6 text-purple-600 mr-2" />
              <span className="text-gray-600">© 2025 Tax Prep AI. Powered by advanced ML for CRA compliance.</span>
            </div>
            <div className="flex items-center gap-4">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">Bank-level security & CRA privacy protection</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;