import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MapPin, Volume2, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserLanguage } from "@/hooks/useUserLanguage";
import { saveSpeechState, loadSpeechState, clearSpeechState, updatePauseState } from "@/lib/speechPersistence";

const TextMode = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentTextRef = useRef<string>("");
  const { toast } = useToast();
  const { language, isLoading: isLanguageLoading } = useUserLanguage();

  // Check for saved speech state on mount
  useEffect(() => {
    const savedState = loadSpeechState();
    if (savedState && savedState.isPaused) {
      setResult(savedState.text);
      currentTextRef.current = savedState.text;
      setCanResume(true);
      setIsPaused(true);
    }
  }, []);

  // Handle page unload and visibility changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        if (currentTextRef.current) {
          saveSpeechState(currentTextRef.current, language, true);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setCanResume(true);
        if (currentTextRef.current) {
          saveSpeechState(currentTextRef.current, language, true);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        if (currentTextRef.current) {
          saveSpeechState(currentTextRef.current, language, true);
        }
      }
    };
  }, [language]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a landmark or destination name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult("");

    try {
      const { data, error } = await supabase.functions.invoke('analyze-landmark', {
        body: { query: query.trim() },
      });

      if (error) throw error;

      const landmarkInfo = data.analysis;
      setResult(landmarkInfo);
      speakResponse(landmarkInfo);
      
      toast({
        title: "Search complete",
        description: "Landmark information retrieved successfully",
      });
    } catch (error) {
      console.error('Error searching landmark:', error);
      toast({
        title: "Error",
        description: "Failed to retrieve information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  const speakResponse = (text: string, isResume: boolean = false) => {
    if ('speechSynthesis' in window) {
      currentTextRef.current = text;
      setIsSpeaking(true);
      setIsPaused(false);
      setCanResume(false);
      
      if (!isResume) {
        clearSpeechState();
      }
      
      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = language;
        
        // Select best voice for language
        const voices = window.speechSynthesis.getVoices();
        const langCode = language.split('-')[0];
        const fullLang = language;
        
        const perfectMatch = voices.find(v => v.lang === fullLang && v.localService);
        const perfectMatchRemote = voices.find(v => v.lang === fullLang);
        const langMatch = voices.find(v => v.lang.startsWith(langCode) && v.localService);
        const langMatchRemote = voices.find(v => v.lang.startsWith(langCode));
        const defaultVoice = voices.find(v => v.default);
        
        utterance.voice = perfectMatch || perfectMatchRemote || langMatch || langMatchRemote || defaultVoice || voices[0];
        
        console.log('Selected voice:', utterance.voice?.name, 'Lang:', utterance.voice?.lang, 'Language setting:', language);
        
        utterance.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          setCanResume(false);
          clearSpeechState();
        };
        
        utterance.onerror = (e) => {
          console.error('Speech synthesis error:', e);
          setIsSpeaking(false);
          setIsPaused(false);
          if (e.error !== 'interrupted') {
            toast({
              title: "Speech Error",
              description: "Failed to play narration. Please try again.",
              variant: "destructive",
            });
          }
        };
        
        utteranceRef.current = utterance;
        
        if (isResume) {
          window.speechSynthesis.resume();
        } else {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      };
      
      if (window.speechSynthesis.getVoices().length > 0) {
        speak();
      } else {
        window.speechSynthesis.onvoiceschanged = speak;
      }
    }
  };

  const pauseSpeaking = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsSpeaking(false);
      setIsPaused(true);
      setCanResume(true);
      if (currentTextRef.current) {
        saveSpeechState(currentTextRef.current, language, true);
      }
    }
  };

  const resumeSpeaking = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
      setIsPaused(false);
      setCanResume(false);
      updatePauseState(false);
    } else if (currentTextRef.current) {
      speakResponse(currentTextRef.current, false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setCanResume(false);
      clearSpeechState();
      currentTextRef.current = "";
    }
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">Search Landmarks</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Enter the name of any landmark or tourist attraction
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., Eiffel Tower, Taj Mahal, Statue of Liberty..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="h-12 text-base"
            />
            <Button
              size="lg"
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="h-12 px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {query && result && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">You searched:</h3>
            </div>
            <p className="text-sm">{query}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-accent/5 rounded-lg border border-accent/20 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-accent" />
                <h3 className="font-semibold text-sm">Landmark Information:</h3>
              </div>
              <div className="flex gap-2">
                {isSpeaking && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={pauseSpeaking}
                    className="gap-1"
                  >
                    <Pause className="w-3 h-3" />
                    Pause
                  </Button>
                )}
                {(isPaused || canResume) && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={resumeSpeaking}
                    className="gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Resume Narration
                  </Button>
                )}
                {(isSpeaking || isPaused || canResume) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={stopSpeaking}
                    className="gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm leading-relaxed">{result}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TextMode;
