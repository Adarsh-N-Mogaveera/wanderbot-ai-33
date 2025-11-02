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
    const { startLocation, availableTime, homeAddress } = await req.json();

    if (!startLocation || !availableTime) {
      return new Response(
        JSON.stringify({ error: 'Start location and available time are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a travel optimization AI. Given a start location, home address, and available time in hours, suggest tourist destinations that can be visited.

For each destination, provide:
- name: The name of the destination
- description: Brief description (1-2 sentences)
- visitTime: Estimated time to visit in minutes
- rating: Rating out of 5
- distanceFromSource: Distance from the starting location in km
- travelTimeFromSource: Travel time from starting location in minutes
- distanceToSource: Distance to the home address in km (for return journey calculation)
- category: One of: cultural, nature, adventure, food, shopping

IMPORTANT: The distanceToSource field should represent the distance from the destination to the HOME ADDRESS, not the starting location, as users need to return home after their trip.

Return between 5-10 destinations sorted by a combination of:
1. High ratings (prefer 4+ stars)
2. Reasonable distance (prefer closer locations)
3. Good travel time efficiency
4. Variety of categories
5. Efficient return route to home address

Respond with a JSON array of destinations.`;

    const userPrompt = `Start location: ${startLocation}
Home address: ${homeAddress || startLocation}
Available time: ${availableTime} hours

Please suggest destinations I can visit with the time available. Consider travel time to each destination from the start location and the return journey back to my HOME ADDRESS (${homeAddress || startLocation}), not the starting location.`;

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
        temperature: 0.7,
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

    // Implement greedy algorithm for trip optimization
    const availableMinutes = availableTime * 60;
    const optimizedRoute: any[] = [];
    let remainingTime = availableMinutes;
    let skippedDestinations: any[] = [];

    // Sort destinations by rating (descending) and distance (ascending)
    const sortedDestinations = [...destinations].sort((a, b) => {
      const ratingDiff = b.rating - a.rating;
      if (Math.abs(ratingDiff) > 0.3) return ratingDiff;
      return a.distanceFromSource - b.distanceFromSource;
    });

    for (const destination of sortedDestinations) {
      const timeRequired = destination.visitTime + destination.travelTimeFromSource;
      
      if (remainingTime >= timeRequired) {
        optimizedRoute.push(destination);
        remainingTime -= timeRequired;
      } else {
        skippedDestinations.push(destination);
      }
    }

    // Calculate return time from last destination to home
    let estimatedReturnTime = 0;
    if (optimizedRoute.length > 0) {
      const lastDestination = optimizedRoute[optimizedRoute.length - 1];
      estimatedReturnTime = lastDestination.distanceToSource 
        ? (lastDestination.distanceToSource / 40) * 60 // Assume 40 km/h average speed
        : lastDestination.travelTimeFromSource;
    }

    const summary = {
      totalLocations: optimizedRoute.length,
      averageRating: optimizedRoute.reduce((sum, d) => sum + d.rating, 0) / (optimizedRoute.length || 1),
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
