import { useState } from 'react';
import { LogIn, LogOut, User, BarChart3, TrendingUp, Target, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { AuthModal } from './components/AuthModal';
import { PredictionInterface } from './components/PredictionInterface';
import { BettingAnalysisPanel } from './components/BettingAnalysisPanel';
import { RealTimeDashboard } from './components/RealTimeDashboard';
import { CLVAnalysisPanel } from './components/CLVAnalysisPanel';

type TabType = 'predictions' | 'betting' | 'dashboard' | 'clv';

function AppContent() {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('predictions');

  const tabs = [
    { id: 'predictions' as TabType, label: 'Predictions', icon: Target },
    { id: 'betting' as TabType, label: 'Betting Analysis', icon: TrendingUp },
    { id: 'dashboard' as TabType, label: 'Live Dashboard', icon: Activity },
    { id: 'clv' as TabType, label: 'CLV Analysis', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">⚽</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Football Predictor</h1>
              <p className="text-xs text-gray-600">Mathematical Analysis Engine</p>
            </div>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Tabs Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'predictions' && <PredictionInterface />}
        {activeTab === 'betting' && <BettingAnalysisPanel />}
        {activeTab === 'dashboard' && <RealTimeDashboard />}
        {activeTab === 'clv' && <CLVAnalysisPanel />}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
