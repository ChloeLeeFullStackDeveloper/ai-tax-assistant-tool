import React, { useState, useEffect } from 'react';
import { Calculator, FileText, MessageCircle, Upload, X, Send, Bot, ClipboardList, User } from 'lucide-react';

// TypeScript Interfaces
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  taxYear?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ChatMessage {
  type: 'user' | 'bot';
  message: string;
  time: string;
}

interface TaxFormData {
  income: string;
  deductions: string;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  taxYear: string;
}

interface TaxCalculation {
  tax: number;
  refund: number;
  effectiveRate: number;
  taxableIncome: number;
}

interface Document {
  id: string;
  name: string;
  uploadDate: string;
  fileType: string;
  size: number;
}

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  taxYear: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: User;
}

// API Service Functions
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const apiService = {
  // Authentication
  login: async (credentials: LoginData): Promise<ApiResponse<User>> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },

  register: async (userData: Omit<RegisterData, 'confirmPassword'>): Promise<ApiResponse<User>> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  // User Profile
  getUserProfile: async (token: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.data || data;
  },

  updateUserProfile: async (token: string, userData: Partial<ProfileData>): Promise<ApiResponse<User>> => {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  // Tax Forms
  getTaxForms: async (token: string): Promise<TaxFormData[]> => {
    const response = await fetch(`${API_BASE_URL}/tax-forms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.data || [];
  },

  saveTaxForm: async (token: string, formData: TaxFormData): Promise<ApiResponse> => {
    const response = await fetch(`${API_BASE_URL}/tax-forms`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(formData)
    });
    return response.json();
  },

  // AI Chat
  sendChatMessage: async (token: string, message: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    return data.data || data;
  },

  // Document Upload
  uploadDocument: async (token: string, file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('document', file);
    
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await response.json();
    return data.data || data;
  },

  getDocuments: async (token: string): Promise<Document[]> => {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.data || [];
  },

  // Tax Calculator
  calculateTax: async (token: string, taxData: TaxFormData): Promise<TaxCalculation> => {
    const response = await fetch(`${API_BASE_URL}/tax/calculate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(taxData)
    });
    const data = await response.json();
    return data.data || data;
  }
};

const TaxPrepAI: React.FC = () => {
  // State Management
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [showChat, setShowChat] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Auth State
  const [loginData, setLoginData] = useState<LoginData>({ email: '', password: '' });
  const [registerData, setRegisterData] = useState<RegisterData>({ 
    name: '', email: '', password: '', confirmPassword: '' 
  });
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: 'bot',
      message: "Hello! I'm your AI Tax Assistant. How can I help you with your taxes today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [newMessage, setNewMessage] = useState<string>('');

  // Form State
  const [taxFormData, setTaxFormData] = useState<TaxFormData>({
    income: '',
    deductions: '',
    filingStatus: 'single',
    taxYear: '2024'
  });

  // Calculator State
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);

  // Document State
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);

  // Profile State
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    taxYear: '2024'
  });

  // Initialize app data
  useEffect(() => {
    const initializeApp = async (): Promise<void> => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const userProfile = await apiService.getUserProfile(token);
          setUser(userProfile);
          setProfileData({
            name: userProfile.name,
            email: userProfile.email,
            phone: userProfile.phone || '',
            taxYear: userProfile.taxYear || '2024'
          });
          
          // Load user's documents
          const documents = await apiService.getDocuments(token);
          setUploadedDocuments(documents);
        } catch (err) {
          console.error('Failed to load user data:', err);
          localStorage.removeItem('authToken');
          setShowLogin(true);
        }
      } else {
        setShowLogin(true);
      }
    };

    initializeApp();
  }, []);

  // Authentication Functions
  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.login(loginData);
      if (response.success && response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        setUser(response.user);
        setShowLogin(false);
        setLoginData({ email: '', password: '' });
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { confirmPassword, ...registrationData } = registerData;
      const response = await apiService.register(registrationData);
      if (response.success && response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        setUser(response.user);
        setShowLogin(false);
        setIsRegistering(false);
        setRegisterData({ name: '', email: '', password: '', confirmPassword: '' });
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Registration error:', err);
    }
    setIsLoading(false);
  };

  const handleLogout = (): void => {
    localStorage.removeItem('authToken');
    setUser(null);
    setShowLogin(true);
    setChatMessages([{
      type: 'bot',
      message: "Hello! I'm your AI Tax Assistant. How can I help you with your taxes today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Chat Functions
  const handleSendMessage = async (): Promise<void> => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      type: 'user',
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');
      
      const response = await apiService.sendChatMessage(token, newMessage);
      
      const botMessage: ChatMessage = {
        type: 'bot',
        message: response.message || "I'm here to help with your tax questions!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        type: 'bot',
        message: "Sorry, I'm having trouble connecting right now. Please try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  // Tax Calculator Functions
  const handleTaxCalculation = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');
      
      const result = await apiService.calculateTax(token, taxFormData);
      setTaxCalculation(result);
    } catch (err) {
      setError('Failed to calculate taxes. Please try again.');
      console.error('Tax calculation error:', err);
    }
    setIsLoading(false);
  };

  // Document Upload Functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');
      
      const result = await apiService.uploadDocument(token, file);
      setUploadedDocuments(prev => [...prev, result]);
    } catch (err) {
      setError('Failed to upload document. Please try again.');
      console.error('Upload error:', err);
    }
    setIsLoading(false);
  };

  // Form Save Functions
  const handleSaveTaxForm = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');
      
      await apiService.saveTaxForm(token, taxFormData);
      setError('');
      alert('Tax form saved successfully!');
    } catch (err) {
      setError('Failed to save tax form. Please try again.');
      console.error('Save error:', err);
    }
    setIsLoading(false);
  };

  // Profile Update Functions
  const handleUpdateProfile = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');
      
      const result = await apiService.updateUserProfile(token, profileData);
      if (result.user) {
        setUser(result.user);
        alert('Profile updated successfully!');
      }
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update error:', err);
    }
    setIsLoading(false);
  };

  // Login/Register Modal
  const renderAuthModal = (): JSX.Element => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h2>

        {!isRegistering ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-700"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  // Component Render Functions
  const renderDashboard = (): JSX.Element => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Tax Form Wizard */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 mx-auto">
          <ClipboardList className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-center mb-2">Tax Form Wizard</h3>
        <p className="text-gray-600 text-center mb-4">Step-by-step guidance through your tax forms</p>
        <button 
          onClick={() => setActiveTab('Tax Forms')}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Get Started
        </button>
      </div>

      {/* AI Assistant */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4 mx-auto">
          <Bot className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-center mb-2">AI Assistant</h3>
        <p className="text-gray-600 text-center mb-4">Chat with our AI for instant tax advice</p>
        <button 
          onClick={() => setShowChat(true)}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
        >
          Start Chat
        </button>
      </div>

      {/* Tax Calculator */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mb-4 mx-auto">
          <Calculator className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-center mb-2">Tax Calculator</h3>
        <p className="text-gray-600 text-center mb-4">Estimate your tax liability and refund</p>
        <button 
          onClick={() => setActiveTab('Calculator')}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
        >
          Calculate
        </button>
      </div>

      {/* Document Manager */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4 mx-auto">
          <FileText className="h-6 w-6 text-purple-600" />
        </div>
        <h3 className="text-xl font-semibold text-center mb-2">Document Manager</h3>
        <p className="text-gray-600 text-center mb-4">Upload and organize your tax documents</p>
        <button 
          onClick={() => setActiveTab('Documents')}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Manage Files
        </button>
      </div>
    </div>
  );

  const renderTaxForms = (): JSX.Element => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Tax Form Wizard</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income</label>
            <input
              type="number"
              value={taxFormData.income}
              onChange={(e) => setTaxFormData({...taxFormData, income: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your annual income"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filing Status</label>
            <select
              value={taxFormData.filingStatus}
              onChange={(e) => setTaxFormData({...taxFormData, filingStatus: e.target.value as TaxFormData['filingStatus']})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="single">Single</option>
              <option value="married_joint">Married Filing Jointly</option>
              <option value="married_separate">Married Filing Separately</option>
              <option value="head_of_household">Head of Household</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Deductions</label>
            <input
              type="number"
              value={taxFormData.deductions}
              onChange={(e) => setTaxFormData({...taxFormData, deductions: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your total deductions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Year</label>
            <select
              value={taxFormData.taxYear}
              onChange={(e) => setTaxFormData({...taxFormData, taxYear: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={handleSaveTaxForm}
            disabled={isLoading}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCalculator = (): JSX.Element => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Tax Calculator</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gross Income</label>
            <input
              type="number"
              value={taxFormData.income}
              onChange={(e) => setTaxFormData({...taxFormData, income: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deductions</label>
            <input
              type="number"
              value={taxFormData.deductions}
              onChange={(e) => setTaxFormData({...taxFormData, deductions: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <button
          onClick={handleTaxCalculation}
          disabled={isLoading}
          className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 mb-6"
        >
          {isLoading ? 'Calculating...' : 'Calculate Tax'}
        </button>
        
        {taxCalculation && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Tax Calculation Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Estimated Tax:</p>
                <p className="text-xl font-bold text-red-600">${taxCalculation.tax.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Refund:</p>
                <p className="text-xl font-bold text-green-600">${taxCalculation.refund.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Effective Rate:</p>
                <p className="text-xl font-bold text-blue-600">{taxCalculation.effectiveRate.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Taxable Income:</p>
                <p className="text-xl font-bold text-gray-600">${taxCalculation.taxableIncome.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDocuments = (): JSX.Element => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Document Manager</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Tax Documents</h3>
          <p className="text-gray-500 mb-4">Drag and drop your files here, or click to browse</p>
          <input
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <label
            htmlFor="file-upload"
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Choose Files
          </label>
        </div>
        
        {uploadedDocuments.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Uploaded Documents</h3>
            <div className="space-y-2">
              {uploadedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <span className="text-sm font-medium">{doc.name}</span>
                      <p className="text-xs text-gray-500">{doc.fileType} • {(doc.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{doc.uploadDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderProfile = (): JSX.Element => (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Profile</h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{user?.name || 'Tax User'}</h3>
            <p className="text-gray-600">{user?.email || 'user@example.com'}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({...profileData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Year</label>
            <select 
              value={profileData.taxYear}
              onChange={(e) => setProfileData({...profileData, taxYear: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex space-x-4">
          <button 
            onClick={handleUpdateProfile}
            disabled={isLoading}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  const renderChatInterface = (): JSX.Element => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-96 flex flex-col">
        {/* Chat Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center">
            <Bot className="h-6 w-6 mr-2" />
            <span className="font-semibold">AI Tax Assistant</span>
          </div>
          <button 
            onClick={() => setShowChat(false)}
            className="text-white hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
    
{/* Chat Messages */}
<div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
                <span className="text-xs opacity-70">{msg.time}</span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 max-w-xs px-4 py-2 rounded-lg">
                <p className="text-sm">AI is typing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about taxes, deductions, forms..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Main App Layout
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 p-2 rounded">
                  <Calculator className="h-6 w-6" />
                </div>
                <span className="ml-2 text-xl font-bold">Tax Prep AI</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowChat(true)}
                className="bg-white bg-opacity-20 p-2 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {['Dashboard', 'Tax Forms', 'Calculator', 'Documents', 'Profile'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-4">
          {error}
          <button 
            onClick={() => setError('')}
            className="float-right text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'Dashboard' && renderDashboard()}
        {activeTab === 'Tax Forms' && renderTaxForms()}
        {activeTab === 'Calculator' && renderCalculator()}
        {activeTab === 'Documents' && renderDocuments()}
        {activeTab === 'Profile' && renderProfile()}
      </main>

      {/* Chat Interface Modal */}
      {showChat && renderChatInterface()}

      {/* Auth Modal */}
      {showLogin && renderAuthModal()}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxPrepAI;
