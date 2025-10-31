import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const VoiceMode = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in your browser.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setResponse("");
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      await analyzeLandmark(text);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Error",
        description: "Failed to recognize speech. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const analyzeLandmark = async (query: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-landmark', {
        body: { query },
      });

      if (error) throw error;

      setResponse(data.information);
      speakResponse(data.information);
    } catch (error) {
      console.error('Error analyzing landmark:', error);
      toast({
        title: "Error",
        description: "Failed to analyze landmark. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const speakResponse = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Card className="p-8">
      <div className="text-center space-y-6">
        <h2 className="text-3xl font-bold">Voice Query Mode</h2>
        <p className="text-muted-foreground">
          Click the microphone and ask about any landmark
        </p>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={startListening}
            disabled={isListening || isLoading}
            className={`rounded-full w-24 h-24 ${isListening ? 'animate-pulse' : ''}`}
          >
            {isListening ? (
              <Mic className="w-12 h-12" />
            ) : (
              <MicOff className="w-12 h-12" />
            )}
          </Button>
        </div>

        {transcript && (
          <div className="mt-6 p-4 bg-primary/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">You asked:</h3>
            </div>
            <p className="text-left">{transcript}</p>
          </div>
        )}

        {isLoading && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="animate-pulse">Analyzing...</p>
          </div>
        )}

        {response && (
          <div className="mt-6 p-4 bg-accent/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-5 h-5 text-accent" />
              <h3 className="font-semibold">Information:</h3>
            </div>
            <p className="text-left">{response}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VoiceMode;