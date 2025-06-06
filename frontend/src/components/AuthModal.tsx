// components/AuthModal.tsx - Fixed Version
import React, { useState } from 'react';
import { Brain, RefreshCw, AlertCircle } from 'lucide-react';
import { AuthModalProps } from '../types';

const AuthModal: React.FC<AuthModalProps> = ({ 
  onLogin, 
  onRegister, 
  isLoading, 
  error, 
  setError 
}) => {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    name: '', email: '', password: '', confirmPassword: '' 
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!loginData.email || !loginData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    onLogin(loginData);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!registerData.name || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Password validation
    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    // Password match validation
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    onRegister(registerData);
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setLoginData({ email: '', password: '' });
    setRegisterData({ name: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-center mb-4">
          <Brain className="h-8 w-8 text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold text-center">Tax Prep AI</h2>
        </div>
        
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-2">
            {isRegistering ? 'Join thousands using AI for smarter Canadian tax prep' : 'Welcome back to AI-powered Canadian tax preparation'}
          </p>
          <div className="flex items-center justify-center text-sm text-green-600">
            <span className="mr-1">🍁</span>
            <span>CRA-Compliant • Bank-Level Security</span>
          </div>
        </div>

        {!isRegistering ? (
          // Login Form
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Signing In...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Sign In with AI
                </>
              )}
            </button>
          </form>
        ) : (
          // Register Form
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
                required
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Create a password (min 6 characters)"
                required
                disabled={isLoading}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Join AI Tax Prep
                </>
              )}
            </button>
          </form>
        )}

        {/* Toggle between Login/Register */}
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            disabled={isLoading}
          >
            {isRegistering 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"
            }
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Demo Credentials */}
        {!isRegistering && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <strong>Demo:</strong> Use any email and password to try the app
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;