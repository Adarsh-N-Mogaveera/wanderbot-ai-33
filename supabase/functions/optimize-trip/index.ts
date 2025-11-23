import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { availableTime, homeLocation, currentLocation, preferences } = await req.json();

    // In a real implementation, this is where you would call external services:
    // 1. Google Maps Places API to find nearby attractions based on preferences.
    // 2. Google Maps Distance Matrix API to get travel times.
    // 3. An optimization algorithm to find the best route.

    // For this prototype, we'll return a static, mocked response.
    const mockedRoute = [
      {
        name: "Museum of Modern Art",
        rating: 4.6,
        coordinates: { lat: 40.7614, lng: -73.9776 },
        description: "Home to a world-class collection of modern and contemporary art.",
        visitTime: 120,
        travelTime: 15,
        distance: 2.5,
        distanceToHome: 8.1
      },
      {
        name: "Central Park",
        rating: 4.8,
        coordinates: { lat: 40.785091, lng: -73.968285 },
        description: "An urban park in Manhattan, offering a green oasis with trails, a zoo, and a carousel.",
        visitTime: 90,
        travelTime: 20,
        distance: 3.1,
        distanceToHome: 10.2
      },
      {
        name: "Times Square",
        rating: 4.4,
        coordinates: { lat: 40.7580, lng: -73.9855 },
        description: "A major commercial intersection, tourist destination, and entertainment center.",
        visitTime: 45,
        travelTime: 10,
        distance: 1.8,
        distanceToHome: 9.5
      },
    ];

    // Mocked polyline for the route. In a real app, this would come from a directions API.
    const mockedPolyline = [
      currentLocation ? [currentLocation.lng, currentLocation.lat] : [-73.97, 40.76],
      [-73.9776, 40.7614],
      [-73.968285, 40.785091],
      [-73.9855, 40.7580],
    ];

    const responsePayload = {
      route: mockedRoute,
      polyline: mockedPolyline,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});