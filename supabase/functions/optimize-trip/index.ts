import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Location {
  name: string;
  visitTime: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startLocation, destinations, availableTime } = await req.json();

    if (!startLocation || !destinations || !availableTime) {
      throw new Error("Missing required parameters");
    }

    // Simple greedy optimization algorithm
    let remainingTime = availableTime * 60; // Convert hours to minutes
    const optimizedRoute: Location[] = [];
    const skippedLocations: Location[] = [];

    // Sort destinations by visit time (shortest first) for greedy approach
    const sortedDestinations = [...destinations].sort((a: Location, b: Location) => 
      a.visitTime - b.visitTime
    );

    // Estimate travel time as 15 minutes between locations
    const travelTimePerLocation = 15;

    for (const destination of sortedDestinations) {
      const totalTimeNeeded = destination.visitTime + travelTimePerLocation;
      
      if (remainingTime >= totalTimeNeeded) {
        optimizedRoute.push(destination);
        remainingTime -= totalTimeNeeded;
      } else {
        skippedLocations.push(destination);
      }
    }

    // Calculate total visit time
    const totalVisitTime = optimizedRoute.reduce((sum, loc) => sum + loc.visitTime, 0);
    const totalTravelTime = optimizedRoute.length * travelTimePerLocation;
    const totalTime = totalVisitTime + totalTravelTime;

    return new Response(
      JSON.stringify({
        startLocation,
        optimizedRoute,
        skippedLocations,
        totalTime,
        remainingTime: Math.max(0, remainingTime),
        summary: {
          totalLocations: optimizedRoute.length,
          totalVisitTime,
          totalTravelTime,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in optimize-trip:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});