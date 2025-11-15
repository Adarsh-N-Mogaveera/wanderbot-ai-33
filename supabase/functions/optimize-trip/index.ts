import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startLocation, availableTime, homeAddress, userPreferences } = await req.json();

    if (!startLocation || !availableTime) {
      return new Response(
        JSON.stringify({ error: 'Start location and available time are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an advanced travel optimization AI. Given a start location, home address, available time, and user preferences, suggest tourist destinations using multi-criteria analysis.

For each destination, provide:
- name: The name of the destination
- description: Brief description (1-2 sentences)
- visitTime: Estimated time to visit in minutes
- rating: Rating out of 5 (float)
- distanceFromSource: Distance from the starting location in km
- travelTimeFromSource: Travel time from starting location in minutes
- distanceToSource: Distance to the home address in km (for return journey calculation)
- category: One of: cultural, nature, adventure, food, shopping, entertainment, historical
- popularity: Popularity score from 1-10
- openingHours: Typical opening hours (e.g., "9:00-18:00")
- bestTimeToVisit: Best time of day (morning/afternoon/evening)
- crowdLevel: Expected crowd level (low/medium/high)

CRITICAL: The distanceToSource field MUST represent the distance from the destination to the HOME ADDRESS, not the starting location.

Return 8-12 diverse destinations that match the user's preferences. Consider:
1. High ratings (4+ stars preferred)
2. Reasonable distance and travel time
3. User's travel preferences (cultural, nature, adventure, food, shopping)
4. Variety of categories
5. Time efficiency for return journey to home
6. Popularity and crowd levels
7. Operating hours compatibility

Respond with a JSON array of destinations.`;

    const userPrompt = `Start location: ${startLocation}
Home address: ${homeAddress || startLocation}
Available time: ${availableTime} hours
User preferences: ${userPreferences && userPreferences.length > 0 ? userPreferences.join(', ') : 'all categories'}

Please suggest destinations matching my preferences. Calculate travel time from start location to each destination AND the return journey time from the last destination back to my HOME ADDRESS (${homeAddress || startLocation}).`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling Lovable AI for trip optimization...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Parse the JSON array from the response
    let destinations = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        destinations = JSON.parse(jsonMatch[0]);
      } else {
        destinations = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse destinations:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Multi-criteria scoring algorithm
    const availableMinutes = availableTime * 60;
    
    // Calculate scores for each destination
    const scoredDestinations = destinations.map((dest: any) => {
      // Normalize scores to 0-1 range
      const ratingScore = dest.rating / 5.0; // 0-1
      const maxDistance = Math.max(...destinations.map((d: any) => d.distanceFromSource));
      const distanceScore = maxDistance > 0 ? 1 - (dest.distanceFromSource / maxDistance) : 1; // 0-1, closer is better
      
      const maxTime = Math.max(...destinations.map((d: any) => d.visitTime + d.travelTimeFromSource));
      const timeScore = maxTime > 0 ? 1 - ((dest.visitTime + dest.travelTimeFromSource) / maxTime) : 1; // 0-1, faster is better
      
      const popularityScore = (dest.popularity || 5) / 10.0; // 0-1
      
      // Check preference match
      let preferenceScore = 0.5; // Default
      if (userPreferences && userPreferences.length > 0) {
        const categoryMatch = userPreferences.some((pref: string) => 
          dest.category.toLowerCase().includes(pref.toLowerCase()) ||
          pref.toLowerCase().includes(dest.category.toLowerCase())
        );
        preferenceScore = categoryMatch ? 1.0 : 0.3;
      }
      
      // Weighted scoring: Rating(30%) + Distance(25%) + Time(20%) + Preference(15%) + Popularity(10%)
      const totalScore = (
        ratingScore * 0.30 +
        distanceScore * 0.25 +
        timeScore * 0.20 +
        preferenceScore * 0.15 +
        popularityScore * 0.10
      );
      
      return { ...dest, score: totalScore };
    });

    // Sort by score descending
    const sortedDestinations = scoredDestinations.sort((a: any, b: any) => b.score - a.score);
    
    const optimizedRoute: any[] = [];
    let remainingTime = availableMinutes;
    const skippedDestinations: any[] = [];

    // Intelligent selection with time budget
    for (const destination of sortedDestinations) {
      const timeRequired = destination.visitTime + destination.travelTimeFromSource;
      
      // Calculate return time for the complete trip
      let totalTripTime = timeRequired;
      if (optimizedRoute.length > 0) {
        // Add accumulated time from previous destinations
        totalTripTime = optimizedRoute.reduce((sum, d) => sum + d.visitTime + d.travelTimeFromSource, 0) + timeRequired;
      }
      
      // Add return time from this destination to home
      const returnTime = destination.distanceToSource 
        ? (destination.distanceToSource / 40) * 60 // Assume 40 km/h average speed
        : destination.travelTimeFromSource;
      
      const completeTripTime = totalTripTime + returnTime;
      
      if (completeTripTime <= availableMinutes) {
        optimizedRoute.push(destination);
        remainingTime = availableMinutes - completeTripTime;
      } else {
        skippedDestinations.push(destination);
      }
    }

    // Calculate accurate return time from last destination to home
    let estimatedReturnTime = 0;
    if (optimizedRoute.length > 0) {
      const lastDestination = optimizedRoute[optimizedRoute.length - 1];
      // Use distanceToSource (distance to home) with consistent speed calculation
      estimatedReturnTime = lastDestination.distanceToSource 
        ? (lastDestination.distanceToSource / 40) * 60 // 40 km/h average speed, result in minutes
        : (lastDestination.distanceFromSource / 40) * 60; // Fallback to source distance
    }

    // Calculate total trip time including all visits, travels, and return
    const totalVisitTime = optimizedRoute.reduce((sum, d) => sum + d.visitTime, 0);
    const totalTravelTime = optimizedRoute.reduce((sum, d) => sum + d.travelTimeFromSource, 0);
    const actualTotalTime = totalVisitTime + totalTravelTime + estimatedReturnTime;
    
    // Recalculate remaining time based on actual total
    remainingTime = availableMinutes - actualTotalTime;

    const summary = {
      totalLocations: optimizedRoute.length,
      averageRating: optimizedRoute.reduce((sum, d) => sum + d.rating, 0) / (optimizedRoute.length || 1),
      totalDistance: optimizedRoute.reduce((sum, d) => sum + d.distanceFromSource, 0),
      totalVisitTime,
      totalTravelTime,
      totalTripTime: actualTotalTime,
      averageScore: optimizedRoute.reduce((sum, d) => sum + (d.score || 0), 0) / (optimizedRoute.length || 1),
    };

    return new Response(
      JSON.stringify({
        startLocation,
        homeAddress: homeAddress || startLocation,
        optimizedRoute,
        remainingTime,
        estimatedReturnTime,
        summary,
        skippedDestinations,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in optimize-trip function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
