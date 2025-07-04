const { useState, useEffect } = React;

const MainPage = () => {
  const [prompt, setPrompt] = useState('');
  const [isWatching, setIsWatching] = useState(false);
  const [detectionState, setDetectionState] = useState('idle');
  const [confidence, setConfidence] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    "Tell me when my cat enters the room... 🐱",
    "Alert me when someone smiles... 😊",
    "Notify me when the sun sets... 🌅",
    "Watch for when my pizza arrives... 🍕",
    "Let me know when the baby wakes up... 👶",
    "Warn me if someone looks sad... 😢"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const startWatching = () => {
    setIsWatching(true);
    setDetectionState('watching');
    // Simulate confidence building
    let conf = 0;
    const interval = setInterval(() => {
      conf += Math.random() * 15;
      setConfidence(Math.min(conf, 100));
      if (conf >= 100) {
        clearInterval(interval);
        setDetectionState('detected');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-hidden relative">
      {/* Animated background stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          >
            ✨
          </div>
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 animate-bounce">
            <span className="inline-block">👁️</span> Sentinela
          </h1>
          <p className="text-2xl text-blue-200">
            Tell me what to watch for in plain words!
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Video Feed */}
          <div className="bg-black/30 backdrop-blur rounded-3xl p-8 mb-8 border border-white/20">
            <div className="aspect-video bg-black/50 rounded-2xl flex items-center justify-center relative overflow-hidden">
              {!isWatching ? (
                <div className="text-center">
                  <p className="text-4xl mb-4">📹</p>
                  <p className="text-xl text-gray-400">Camera feed will appear here</p>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {/* Simulated video feed */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
                  
                  {/* Scanning effect */}
                  {detectionState === 'watching' && (
                    <div className="absolute inset-0">
                      <div className="h-1 bg-yellow-400 animate-scan" />
                    </div>
                  )}

                  {/* Detection celebration */}
                  {detectionState === 'detected' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center animate-zoomIn">
                        <p className="text-8xl mb-4">🎉</p>
                        <p className="text-3xl font-bold text-yellow-400">DETECTED!</p>
                      </div>
                    </div>
                  )}

                  {/* Confidence meter */}
                  {detectionState === 'watching' && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/60 rounded-full p-2">
                        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-400 to-green-400 transition-all duration-300"
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                        <p className="text-center mt-1 text-sm">
                          Confidence: {Math.round(confidence)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Magic Input */}
          <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
            <div className="mb-6">
              <label className="block text-xl mb-3 font-semibold">
                ✨ What should I watch for?
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholders[placeholderIndex]}
                className="w-full px-6 py-4 rounded-2xl bg-white/10 border border-white/30 text-xl placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:bg-white/20 transition-all"
                disabled={isWatching}
              />
            </div>

            {/* Notification Type */}
            <div className="mb-6">
              <label className="block text-xl mb-3 font-semibold">
                🔔 How should I notify you?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '🔊', label: 'Sound' },
                  { icon: '📧', label: 'Email' },
                  { icon: '💬', label: 'SMS' },
                  { icon: '🔗', label: 'Webhook' }
                ].map((option) => (
                  <button
                    key={option.label}
                    className="p-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 transition-all hover:scale-105"
                    disabled={isWatching}
                  >
                    <p className="text-2xl mb-1">{option.icon}</p>
                    <p className="text-sm">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={startWatching}
              disabled={!prompt || isWatching}
              className={`w-full py-5 rounded-2xl text-2xl font-bold transition-all transform hover:scale-105 ${
                isWatching 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 animate-pulse'
              }`}
            >
              {isWatching ? '👀 Watching...' : '🚀 Start Watching!'}
            </button>
          </div>

          {/* Fun Examples */}
          <div className="mt-8 text-center">
            <p className="text-lg mb-4 text-blue-200">Try these magical examples:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "when my dog sits 🐕",
                "if someone dances 💃",
                "when coffee is ready ☕",
                "if a bird appears 🦅"
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(`Alert me ${example}`)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all hover:scale-105"
                  disabled={isWatching}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(400px); }
        }
        
        @keyframes zoomIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        
        .animate-zoomIn {
          animation: zoomIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};
