import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Lightbulb, Calculator,
  FileText, TrendingUp, X, RefreshCw
} from 'lucide-react';

import { ChatModalProps, ChatMessage } from '../types';

const ChatModal: React.FC<ChatModalProps> = ({
  chatMessages,
  setChatMessages,
  setShowChat,
  isLoading,
  setIsLoading,
  activeTab,
  taxFormData,
  uploadedFiles,
  selectedProvince
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickSuggestions = [
    { icon: Calculator, text: 'Calculate my taxes', category: 'calculation' },
    { icon: TrendingUp, text: 'RRSP optimization advice', category: 'advice' },
    { icon: FileText, text: 'What documents do I need?', category: 'documents' },
    { icon: Lightbulb, text: 'Tax saving tips for 2024', category: 'tips' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        selectedProvince,
        taxFormData: {
          income: taxFormData?.income || '',
          filingStatus: taxFormData?.filingStatus || 'single'
        },
        documentsCount: Array.isArray(uploadedFiles) ? uploadedFiles.length : 0,
        hasDocuments: Array.isArray(uploadedFiles) && uploadedFiles.length > 0,
        chatHistory: chatMessages.slice(-5)
      };

      const response = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: message.trim(), context: limitedContext })
      });

      const data = await response.json();

      if (data.success) {
        const botMessage: ChatMessage = {
          type: 'bot',
          message: data.data.message || "Sorry, please try again.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: data.data.confidence,
          aiInsight: data.data.aiInsight
        };
        setChatMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        type: 'bot',
        message: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 0,
        isError: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">AI Tax Assistant</h2>
          <button onClick={() => setShowChat(false)}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`mb-3 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block px-4 py-2 rounded-lg ${msg.type === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {msg.message}
              </div>
              <div className="text-xs text-gray-500 mt-1">{msg.time}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Ask something about Canadian taxes..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button onClick={() => handleSendMessage()} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
