// components/ChatModal.tsx - AI Chat Component with Length Limits
import React, { useState } from 'react';
import { Brain, X, Send, RefreshCw, Trash2 } from 'lucide-react';
import { ChatModalProps, ChatMessage } from '../types';

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
  const [newMessage, setNewMessage] = useState<string>('');
  const MAX_MESSAGES = 50;

  // Add message with count limit
  const addMessage = (message: ChatMessage) => {
    setChatMessages(prev => {
      const updated = [...prev, message];
      if (updated.length > MAX_MESSAGES) {
        return updated.slice(-MAX_MESSAGES);
      }
      return updated;
    });
  };

  // Enhanced Chat Function with Length Limits
  const handleSendMessage = async (): Promise<void> => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      type: 'user',
      message: newMessage.slice(0, 1000), // Limit message length
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    addMessage(userMessage);
    const messageToSend = newMessage;
    setNewMessage('');
    setIsLoading(true);

    try {
      // Simulate AI response for demo (replace with real API call)
      setTimeout(() => {
        const responses = [
          "Based on your income level, I recommend maximizing your RRSP contribution to reduce your taxable income with CRA.",
          "I've analyzed your Canadian tax situation and found 3 optimization opportunities that could save you $5,000+ annually.",
          "For your filing status, consider claiming all eligible tax credits including the Basic Personal Amount of $15,705.",
          "I can help you track business expenses and home office deductions for your CRA filing.",
          "Your T4 slip shows you're eligible for several Canadian tax credits. Would you like me to explain them?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const botMessage: ChatMessage = {
          type: 'bot',
          message: randomResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: Math.floor(Math.random() * 20) + 80,
          aiInsight: true
        };

        addMessage(botMessage);
        setIsLoading(false);
      }, 1500);

      // Real API call would be:
      /*
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No auth token');
      
      const limitedContext = {
        currentTab: activeTab,
        taxFormData: {
          income: taxFormData.income,
          filingStatus: taxFormData.filingStatus
        },
        documentsCount: uploadedFiles.length,
        chatHistory: chatMessages.slice(-5)
      };

      const response = await apiService.sendChatMessage(token, messageToSend, limitedContext);
      
      const botMessage: ChatMessage = {
        type: 'bot',
        message: response.message || "Sorry, please try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: response.confidence,
        aiInsight: response.aiInsight
      };

      addMessage(botMessage);
      setIsLoading(false);
      */

    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        type: 'bot',
        message: err.message || "Connection issue. Please try with a shorter message.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      addMessage(errorMessage);
      setIsLoading(false);
    }
  };

  // Clear chat function
  const clearChat = () => {
    setChatMessages([{
      type: 'bot',
      message: "Chat has been reset. Please ask your question again.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aiInsight: true
    }]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Brain className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-semibold">AI Tax Assistant</h3>
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              🍁 Canadian CRA Expert
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearChat}
              className="text-gray-400 hover:text-gray-600"
              title="Clear Chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setShowChat(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                msg.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="text-sm">{msg.message}</p>
                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                  <span>{msg.time}</span>
                  {msg.confidence && (
                    <span className="flex items-center">
                      <Brain className="h-3 w-3 mr-1" />
                      {msg.confidence}%
                    </span>
                  )}
                </div>
                {msg.aiInsight && (
                  <div className="mt-1">
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      AI Insight
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex items-center">
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.slice(0, 1000))} // Limit input length
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder="Ask about Canadian taxes, RRSP, TFSA... (max 1000 chars)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !newMessage.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-400 text-right">
            {newMessage.length}/1000
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            💡 Try asking: "How much can I save with RRSP?" or "What documents do I need?"
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;