
import React, { useState, useEffect, useCallback } from 'react';
import { Word, StudentLevel, QuizQuestion, UserStats, TargetLanguage } from './types';
import { geminiService } from './services/geminiService';
import WordCard from './components/WordCard';
import Quiz from './components/Quiz';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [level, setLevel] = useState<StudentLevel>(StudentLevel.JUNIOR);
  const [targetLang, setTargetLang] = useState<TargetLanguage>(TargetLanguage.TRADITIONAL_CHINESE);
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('engvantage_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        targetLanguage: parsed.targetLanguage || TargetLanguage.TRADITIONAL_CHINESE
      };
    }
    return {
      totalWordsLearned: 0,
      currentStreak: 0,
      lastStudyDate: '',
      level: StudentLevel.JUNIOR,
      targetLanguage: TargetLanguage.TRADITIONAL_CHINESE
    };
  });

  // Initialize target language from stats
  useEffect(() => {
    if (stats.targetLanguage) {
      setTargetLang(stats.targetLanguage);
    }
  }, [stats.targetLanguage]);

  const checkApiKey = useCallback(async () => {
    if ((window as any).aistudio) {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } else {
      setHasApiKey(true);
    }
  }, []);

  const handleConnectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const loadWords = useCallback(async (selectedLevel: StudentLevel, language: TargetLanguage) => {
    if (!hasApiKey) return;
    setIsLoading(true);
    try {
      const newWords = await geminiService.fetchWordsByLevel(selectedLevel, language);
      setWords(newWords);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasApiKey]);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  useEffect(() => {
    if (hasApiKey) {
      loadWords(level, targetLang);
    }
  }, [level, targetLang, loadWords, hasApiKey]);

  useEffect(() => {
    localStorage.setItem('engvantage_stats', JSON.stringify({ ...stats, targetLanguage: targetLang }));
  }, [stats, targetLang]);

  const toggleLearned = (id: string) => {
    setWords(prev => prev.map(w => {
      if (w.id === id) {
        const newState = !w.learned;
        if (newState) {
          setStats(s => ({ ...s, totalWordsLearned: s.totalWordsLearned + 1 }));
        } else {
          setStats(s => ({ ...s, totalWordsLearned: Math.max(0, s.totalWordsLearned - 1) }));
        }
        return { ...w, learned: newState };
      }
      return w;
    }));
  };

  const startQuiz = async () => {
    setIsLoading(true);
    try {
      const questions = await geminiService.generateQuiz(words);
      setQuizQuestions(questions);
      setIsQuizMode(true);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = (score: number) => {
    alert(`Quiz Complete! You scored ${score} out of ${quizQuestions.length}.`);
    setIsQuizMode(false);
  };

  const handleLanguageChange = (lang: TargetLanguage) => {
    setTargetLang(lang);
    setShowLangMenu(false);
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-indigo-200 mx-auto mb-8">
            E
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Welcome to EngVantage</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            To start your AI-powered English learning journey, please connect your Google Gemini API key.
          </p>
          <button 
            onClick={handleConnectKey}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center space-x-3"
          >
            <span>Connect to Gemini AI</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (isQuizMode) {
    return (
      <Quiz 
        questions={quizQuestions} 
        onComplete={handleQuizComplete} 
        onCancel={() => setIsQuizMode(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
              E
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight hidden lg:block">EngVantage</h1>
          </div>

          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setLevel(StudentLevel.JUNIOR)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${level === StudentLevel.JUNIOR ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Junior High
            </button>
            <button 
              onClick={() => setLevel(StudentLevel.SENIOR)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${level === StudentLevel.SENIOR ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Senior High
            </button>
            <button 
              onClick={() => setLevel(StudentLevel.TOEIC)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${level === StudentLevel.TOEIC ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              TOEIC
            </button>
          </nav>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-white hover:border-indigo-300 transition-all group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-400 group-hover:text-indigo-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                </svg>
                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 hidden xs:block">{targetLang}</span>
              </button>

              {showLangMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {Object.values(TargetLanguage).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-between ${targetLang === lang ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {lang}
                        {targetLang === lang && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-slate-400 uppercase">Words Learned</p>
              <p className="text-lg font-bold text-indigo-600">{stats.totalWordsLearned}</p>
            </div>

            <button 
              onClick={() => loadWords(level, targetLang)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-2">Master English Today</h2>
              <p className="text-slate-500 text-lg max-w-2xl">
                Explore 10 curated words for {level} in {targetLang}.
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-full border border-green-100 self-start md:self-end">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider">AI Live</span>
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium text-center">Summoning {level} translations in {targetLang}...</p>
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {words.map(word => (
              <WordCard 
                key={word.id} 
                word={word} 
                onToggleLearned={toggleLearned}
              />
            ))}
          </div>
        )}

        {!isLoading && words.length > 0 && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-20 w-full px-4 flex justify-center">
            <button 
              onClick={startQuiz}
              className="flex items-center space-x-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black hover:-translate-y-1 transition-all duration-300 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0V9.457c0-.621-.504-1.125-1.125-1.125h-.872M9.507 8.332V4.5a2.25 2.25 0 0 1 2.25-2.25h1.5a2.25 2.25 0 0 1 2.25 2.25v3.832" />
              </svg>
              <span>Take a {targetLang} Quiz</span>
            </button>
          </div>
        )}
      </main>

      {/* Mobile Level Nav Overlay */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-slate-200 p-1.5 rounded-2xl grid grid-cols-3 gap-1 z-30 shadow-2xl">
        <button 
          onClick={() => setLevel(StudentLevel.JUNIOR)}
          className={`py-3 rounded-xl text-xs font-bold transition-all ${level === StudentLevel.JUNIOR ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}
        >
          Junior
        </button>
        <button 
          onClick={() => setLevel(StudentLevel.SENIOR)}
          className={`py-3 rounded-xl text-xs font-bold transition-all ${level === StudentLevel.SENIOR ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}
        >
          Senior
        </button>
        <button 
          onClick={() => setLevel(StudentLevel.TOEIC)}
          className={`py-3 rounded-xl text-xs font-bold transition-all ${level === StudentLevel.TOEIC ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}
        >
          TOEIC
        </button>
      </div>
    </div>
  );
};

export default App;
