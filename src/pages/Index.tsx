import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Camera, MapPin, Sparkles, LogOut, User, Loader2 } from "lucide-react";
import VoiceMode from "@/components/VoiceMode";
import ImageMode from "@/components/ImageMode";
import TripPlanner from "@/components/TripPlanner";

const Index = () => {
  const [activeTab, setActiveTab] = useState("voice");
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUserEmail(session.user.email || null);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
      if (session) {
        setUserEmail(session.user.email || null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handlePreferences = () => {
    navigate('/preferences');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 space-y-2 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-primary animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              WanderBot AI
            </h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Your intelligent travel companion powered by AI
          </p>
          
          {/* User Menu */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreferences}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              Preferences
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mode Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="voice" className="gap-2">
              <Mic className="w-4 h-4" />
              <span className="hidden md:inline">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2">
              <Camera className="w-4 h-4" />
              <span className="hidden md:inline">Image</span>
            </TabsTrigger>
            <TabsTrigger value="trip" className="gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden md:inline">Trip</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voice">
            <VoiceMode />
          </TabsContent>

          <TabsContent value="image">
            <ImageMode />
          </TabsContent>

          <TabsContent value="trip">
            <TripPlanner />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
