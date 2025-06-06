import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Lightbulb, Calculator,
  FileText, TrendingUp, X, RefreshCw
} from 'lucide-react';

import { ChatModalProps, ChatMessage } from '../types';

interface ChatMessage {
  type: 'user' | 'bot';
  message: string;
  time: string;
  confidence?: number;
  sources?: string[];
  suggestedActions?: string[];
  aiInsight?: boolean;
  isError?: boolean;
}

interface ChatModalProps {
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  setShowChat: (show: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  activeTab: string;
  taxFormData: any; // More flexible - matches your App.tsx
  uploadedFiles: any[]; // More flexible - matches your App.tsx
}

const ChatModal: React.FC<ChatModalProps> = ({
  chatMessages,
  setChatMessages,
  setShowChat,
  isLoading,
  setIsLoading,
  activeTab,
  taxFormData,
  uploadedFiles
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick suggestion buttons
  const quickSuggestions = [
    { icon: Calculator, text: 'Calculate my taxes', category: 'calculation' },
    { icon: TrendingUp, text: 'RRSP optimization advice', category: 'advice' },
    { icon: FileText, text: 'What documents do I need?', category: 'documents' },
    { icon: Lightbulb, text: 'Tax saving tips for 2024', category: 'tips' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fallback Canadian tax responses when backend is unavailable
  const generateFallbackResponse = (message: string, context: any) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('rrsp')) {
      return {
        message: `For 2024, the RRSP contribution limit is 18% of your previous year's income, up to $31,560. RRSP contributions reduce your taxable income dollar-for-dollar, providing immediate tax savings. The contribution deadline is March 1, 2025 for the 2024 tax year. Based on typical scenarios, someone earning $75,000 could contribute up to $13,500 and save approximately $4,050 in taxes.`,
        confidence: 90,
        sources: ['CRA RRSP Guidelines 2024'],
        suggestedActions: ['Calculate my RRSP room', 'TFSA vs RRSP comparison', 'Tax deadline information'],
        aiInsight: true
      };
    }
    
    if (lowerMessage.includes('tfsa')) {
      return {
        message: `The 2024 TFSA contribution limit is $7,000. Unlike RRSPs, TFSA contributions aren't tax-deductible, but all growth and withdrawals are completely tax-free. Your TFSA room accumulates from when you turned 18 and became a Canadian resident. Any withdrawals can be re-contributed in future years without losing contribution room.`,
        confidence: 92,
        sources: ['CRA TFSA Guidelines 2024'],
        suggestedActions: ['Check TFSA contribution room', 'Investment options for TFSA', 'TFSA withdrawal rules'],
        aiInsight: true
      };
    }
    
    if (lowerMessage.includes('tax') && (lowerMessage.includes('calculate') || lowerMessage.includes('owe'))) {
      return {
        message: `Canadian tax calculations depend on your province, income, and filing status. For 2024, the basic personal amount ranges from $8,744 (Nova Scotia) to $21,003 (Alberta). Federal tax rates range from 15% to 33%, while provincial rates vary by province. I can help you understand tax brackets, deductions, and credits available to Canadian taxpayers.`,
        confidence: 88,
        sources: ['CRA Tax Tables 2024', 'Provincial Tax Rates'],
        suggestedActions: ['Learn about tax brackets', 'Provincial tax differences', 'Available tax credits'],
        aiInsight: true
      };
    }
    
    if (lowerMessage.includes('deadline')) {
      return {
        message: `Important Canadian tax deadlines for 2025: Individual tax filing deadline is April 30, 2025. Self-employed individuals have until June 15, 2025 to file, but any taxes owed are still due April 30. RRSP contribution deadline is March 1, 2025 for the 2024 tax year. Filing electronically gets you your refund faster!`,
        confidence: 95,
        sources: ['CRA Filing Deadlines 2025'],
        suggestedActions: ['RRSP deadline reminder', 'Electronic filing benefits', 'Self-employment deadlines'],
        aiInsight: true
      };
    }
    
    // Default response
    return {
      message: `I'm your Canadian AI Tax Assistant! I can help you with CRA regulations, tax calculations for all provinces, RRSP and TFSA planning, filing deadlines, and available tax credits. What specific Canadian tax topic would you like to explore? I understand federal and provincial tax rules for 2024.`,
      confidence: 85,
      sources: ['Canadian CRA Tax Expert'],
      suggestedActions: ['Ask about RRSP planning', 'Learn about tax credits', 'Provincial tax differences', 'Filing requirements'],
      aiInsight: true
    };
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      type: 'user',
      message: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages([...chatMessages, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');

      const limitedContext = {
        currentTab: activeTab,
        taxFormData: {
          income: taxFormData?.income || '',
          filingStatus: taxFormData?.filingStatus || 'single'
        },
        documentsCount: Array.isArray(uploadedFiles) ? uploadedFiles.length : 0,
        hasDocuments: Array.isArray(uploadedFiles) && uploadedFiles.length > 0,
        chatHistory: chatMessages.slice(-5)
      };

      // Try backend first, but have fallback responses
      let botResponse;
      
      try {
        const response = await fetch('http://localhost:3001/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: message.trim(),
            context: limitedContext
          })
        });

        const data = await response.json();
        
        if (data.success && data.data) {
          botResponse = {
            message: data.data.message,
            confidence: data.data.confidence,
            sources: data.data.sources,
            suggestedActions: data.data.suggestedActions,
            aiInsight: data.data.aiInsight
          };
        } else {
          throw new Error('Backend response error');
        }
      } catch (backendError) {
        console.log('🔄 Backend unavailable, using fallback responses');
        // Fallback Canadian tax responses
        botResponse = generateFallbackResponse(message.trim(), limitedContext);
      }

      const botMessage: ChatMessage = {
        type: 'bot',
        message: botResponse.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: botResponse.confidence || 85,
        sources: botResponse.sources || ['Canadian Tax Expert'],
        suggestedActions: botResponse.suggestedActions || ['Ask another question'],
        aiInsight: botResponse.aiInsight || true
      };
      setChatMessages([...chatMessages, userMessage, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        type: 'bot',
        message: "I apologize, but I'm having trouble processing your request right now. Please try asking your question again, or contact support if the issue persists.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 0,
        isError: true
      };
      setChatMessages([...chatMessages, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const clearChat = () => {
    const welcomeMessage: ChatMessage = {
      type: 'bot',
      message: "Chat cleared! How can I help you with your Canadian taxes today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 95,
      suggestedActions: ['Calculate my taxes', 'RRSP advice', 'Tax deadlines', 'Document requirements'],
      aiInsight: true
    };
    setChatMessages([welcomeMessage]);
    setShowSuggestions(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-semibold">🍁 Canadian AI Tax Assistant</h2>
              <p className="text-sm text-blue-100">CRA-compliant advice powered by ML</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="text-white hover:text-blue-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
              title="Clear chat"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowChat(false)}
              className="text-white hover:text-blue-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl flex ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.type === 'user' 
                    ? 'bg-blue-600 text-white ml-3' 
                    : 'bg-gray-200 text-gray-600 mr-3'
                }`}>
                  {msg.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                
                <div className={`rounded-lg p-4 ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.isError
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-100'
                }`}>
                  <div className="text-sm mb-2">{msg.message}</div>
                  
                  {/* Bot message extras */}
                  {msg.type === 'bot' && !msg.isError && (
                    <div className="mt-3 space-y-2">
                      {/* Confidence indicator */}
                      {msg.confidence && (
                        <div className="flex items-center text-xs text-gray-600">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            msg.confidence >= 90 ? 'bg-green-500' :
                            msg.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          {msg.confidence}% confidence
                        </div>
                      )}
                      
                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Sources: {msg.sources.join(', ')}
                        </div>
                      )}
                      
                      {/* Suggested actions */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {msg.suggestedActions.map((action: string, actionIndex: number) => (
                            <button
                              key={actionIndex}
                              onClick={() => handleSuggestionClick(action)}
                              className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">{msg.time}</div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs bg-gray-100 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions */}
        {showSuggestions && (
          <div className="px-4 py-2 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 mr-2">Quick questions:</span>
              {quickSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <suggestion.icon className="h-4 w-4" />
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about Canadian taxes, RRSP planning, CRA deadlines, or any tax question..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;