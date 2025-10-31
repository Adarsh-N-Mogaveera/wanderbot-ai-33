import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Destination {
  name: string;
  visitTime: number;
}

const TripPlanner = () => {
  const [startLocation, setStartLocation] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [destinations, setDestinations] = useState<Destination[]>([
    { name: "", visitTime: 60 },
  ]);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addDestination = () => {
    setDestinations([...destinations, { name: "", visitTime: 60 }]);
  };

  const removeDestination = (index: number) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const updateDestination = (index: number, field: keyof Destination, value: string | number) => {
    const updated = [...destinations];
    updated[index] = { ...updated[index], [field]: value };
    setDestinations(updated);
  };

  const optimizeTrip = async () => {
    if (!startLocation || !availableTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const validDestinations = destinations.filter(d => d.name.trim() !== "");
    if (validDestinations.length === 0) {
      toast({
        title: "No Destinations",
        description: "Please add at least one destination.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-trip', {
        body: {
          startLocation,
          destinations: validDestinations,
          availableTime: parseFloat(availableTime),
        },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Trip Optimized!",
        description: `Planned ${data.optimizedRoute.length} locations`,
      });
    } catch (error) {
      console.error('Error optimizing trip:', error);
      toast({
        title: "Error",
        description: "Failed to optimize trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Smart Trip Planner</h2>
          <p className="text-muted-foreground">
            Optimize your itinerary based on available time
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="start">Starting Location</Label>
            <Input
              id="start"
              placeholder="e.g., Paris, France"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="time">Available Time (hours)</Label>
            <Input
              id="time"
              type="number"
              step="0.5"
              placeholder="e.g., 3"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Destinations</Label>
              <Button onClick={addDestination} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>

            {destinations.map((dest, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Landmark name"
                  value={dest.name}
                  onChange={(e) => updateDestination(index, "name", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Minutes"
                  value={dest.visitTime}
                  onChange={(e) => updateDestination(index, "visitTime", parseInt(e.target.value) || 0)}
                  className="w-28"
                />
                {destinations.length > 1 && (
                  <Button
                    onClick={() => removeDestination(index)}
                    size="icon"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={optimizeTrip}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Optimizing..." : "Optimize Trip"}
          </Button>
        </div>

        {result && (
          <div className="mt-8 space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Optimized Route
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Starting from: <span className="font-medium text-foreground">{result.startLocation}</span>
                </p>
                {result.optimizedRoute.map((location: Destination, index: number) => (
                  <div key={index} className="pl-4 border-l-2 border-primary">
                    <p className="font-medium">{index + 1}. {location.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Visit time: {location.visitTime} minutes
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-accent/5 rounded-lg">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                Time Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Locations:</p>
                  <p className="font-medium">{result.summary.totalLocations}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Visit Time:</p>
                  <p className="font-medium">{result.summary.totalVisitTime} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Travel Time:</p>
                  <p className="font-medium">{result.summary.totalTravelTime} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Free Time:</p>
                  <p className="font-medium">{Math.round(result.remainingTime)} min</p>
                </div>
              </div>
            </div>

            {result.skippedLocations.length > 0 && (
              <div className="p-4 bg-destructive/5 rounded-lg">
                <h3 className="font-semibold mb-2">Skipped (Not Enough Time):</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {result.skippedLocations.map((location: Destination, index: number) => (
                    <li key={index}>{location.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TripPlanner;