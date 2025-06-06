// App.tsx - Fixed Main Application Component
import React, { useState, useEffect } from 'react';
import { 
  Calculator, FileText, User, Brain, BarChart3, ClipboardList, 
  MessageCircle, RefreshCw, X, AlertCircle, Shield
} from 'lucide-react';

// Import components
import AuthModal from './components/AuthModal';
import ChatModal from './components/ChatModal';
import Dashboard from './components/Dashboard';
import Documents from './components/Documents';
import TaxForms from './components/TaxForms';
import TaxCalculator from './components/TaxCalculator';
import Profile from './components/Profile';
import { User as UserType, TaxFormData, ChatMessage, UploadedFile, AIInsight } from './types';

type ActiveTab = 'Dashboard' | 'Documents' | 'Tax Forms' | 'Calculator' | 'Profile';

const App: React.FC = () => {
  // Authentication State
  const [user, setUser] = useState<UserType | null>(null);
  const [showLogin, setShowLogin] = useState<boolean>(!localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // State Management
  const [activeTab, setActiveTab] = useState<ActiveTab>('Dashboard');
  const [showChat, setShowChat] = useState<boolean>(false);
  
  // Form Data
  const [taxFormData, setTaxFormData] = useState<TaxFormData>({
    income: '',
    deductions: '',
    filingStatus: 'single',
    taxYear: '2024'
  });

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: 'bot',
      message: "Hello! I'm your Canadian AI Tax Assistant. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 95,
      aiInsight: true
    }
  ]);

  // Document State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<UploadedFile | null>(null);

  // AI Insights State - Fixed variable name
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

  // Initialize app
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Simulate user load for demo
      setUser({ id: '1', name: 'John Doe', email: 'john.doe@example.com' });
      setShowLogin(false);
    }
  }, []);

  // Authentication handlers
  const handleLogin = async (loginData: { email: string; password: string }) => {
    setIsLoading(true);
    setError('');
    try {
      // Simulate login
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
      // Simulate registration
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
    setUser(null);
    setShowLogin(true);
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
      {/* Show login modal if not authenticated */}
      {showLogin && (
        <AuthModal
          onLogin={handleLogin}
          onRegister={handleRegister}
          isLoading={isLoading}
          error={error}
          setError={setError}
        />
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
                  <button
                    onClick={() => setShowChat(true)}
                    className="bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg hover:bg-opacity-30 transition-colors flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <MessageCircle className="h-4 w-4" />
                    AI Chat
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
              taxFormData={taxFormData}
              setTaxFormData={setTaxFormData}
              setError={setError}
              setIsLoading={setIsLoading}
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