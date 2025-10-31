import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import VoiceMode from "@/components/VoiceMode";
import ImageMode from "@/components/ImageMode";
import TripPlanner from "@/components/TripPlanner";
import { Mic, Camera, MapPin } from "lucide-react";

type Mode = "voice" | "image" | "trip" | null;

const Index = () => {
  const [activeMode, setActiveMode] = useState<Mode>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            WanderBot AI
          </h1>
          <p className="text-xl text-muted-foreground">
            Your Intelligent Travel Companion
          </p>
        </header>

        {!activeMode ? (
          <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-3">
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary"
              onClick={() => setActiveMode("voice")}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Voice Query</h2>
                <p className="text-muted-foreground">
                  Ask about landmarks using your voice
                </p>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-secondary"
              onClick={() => setActiveMode("image")}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-secondary/10">
                  <Camera className="w-8 h-8 text-secondary" />
                </div>
                <h2 className="text-2xl font-semibold">Image Recognition</h2>
                <p className="text-muted-foreground">
                  Upload photos to identify landmarks
                </p>
              </div>
            </Card>

            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-accent"
              onClick={() => setActiveMode("trip")}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-accent/10">
                  <MapPin className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-2xl font-semibold">Trip Planner</h2>
                <p className="text-muted-foreground">
                  Optimize your itinerary with AI
                </p>
              </div>
            </Card>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <Button
              variant="outline"
              onClick={() => setActiveMode(null)}
              className="mb-6"
            >
              ← Back to Menu
            </Button>

            {activeMode === "voice" && <VoiceMode />}
            {activeMode === "image" && <ImageMode />}
            {activeMode === "trip" && <TripPlanner />}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;