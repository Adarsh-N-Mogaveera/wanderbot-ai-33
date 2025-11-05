import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MapPin, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TextMode = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

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

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
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
              {isSpeaking && (
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
            <p className="text-sm leading-relaxed">{result}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TextMode;
