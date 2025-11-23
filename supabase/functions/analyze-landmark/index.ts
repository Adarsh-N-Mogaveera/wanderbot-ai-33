import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      throw new Error("No image data provided.");
    }

    // In a real implementation, this is where you would call external services:
    // 1. Image Recognition API to get the landmark name from the image.
    // 2. Wikipedia API to fetch details about the landmark.
    // 3. Text Summarization API to create a summary and extract fun facts.

    // For this prototype, we'll return a static, mocked response.
    const responsePayload = {
      name: "Eiffel Tower",
      summary: "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. It is named after the engineer Gustave Eiffel, whose company designed and built the tower from 1887 to 1889.",
      coordinates: { lat: 48.8584, lng: 2.2945 },
      fun_facts: [
        "The tower was the main exhibit of the 1889 Exposition Universelle (World's Fair).",
        "It is repainted every seven years, a process that requires 60 tons of paint.",
        "The tower's height changes by up to 15 cm (6 in) due to temperature fluctuations."
      ]
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