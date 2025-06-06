import { useState } from 'react';
import './ChatbotPage.css';

const ChatbotPage = () => {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hello! I\'m your AI Tax Assistant. How can I help you with your taxes today?' }]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });

    const data = await response.json();
    setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
  };

  return (
    <div className="chatbot-container">
      <div className="chat-header">🤖 AI Tax Assistant</div>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about taxes, deductions, forms..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default ChatbotPage;
