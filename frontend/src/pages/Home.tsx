import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold">Welcome to Your AI Tax Assistant</h1>
      <p className="text-gray-600 mt-2">Get personalized help with your tax preparation</p>

      <div className="grid grid-cols-2 gap-6 mt-10 max-w-4xl mx-auto">
        <div className="p-6 bg-white rounded shadow">
          <h2 className="text-xl font-semibold mb-2">🧾 Tax Form Wizard</h2>
          <p className="mb-4">Step-by-step guidance through your tax forms</p>
          <button className="bg-purple-500 text-white px-4 py-2 rounded">Get Started</button>
        </div>
        <div className="p-6 bg-white rounded shadow">
          <h2 className="text-xl font-semibold mb-2">🤖 AI Assistant</h2>
          <p className="mb-4">Chat with our AI for instant tax advice</p>
          <button onClick={() => navigate('/assistant')} className="bg-purple-500 text-white px-4 py-2 rounded">Start Chat</button>
        </div>
      </div>
    </div>
  );
};

export default Home;
