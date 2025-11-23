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
    const { query, imageData, location, includeWikipedia } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = `You are an expert travel guide AI specializing in landmarks and tourist attractions worldwide.

When analyzing images or answering queries:
- Identify the landmark with high confidence
- Provide fascinating historical facts and cultural significance${location ? '\n- VERIFY the landmark matches the GPS coordinates provided' : ''}
${includeWikipedia ? '- Include key encyclopedic facts (founding date, architect, historical events)' : ''}
- Include practical visitor information (best times, notable features)
- Keep responses concise but informative (2-3 paragraphs)
- Use an engaging, friendly tone`;

    const messages: any[] = [
      {
        role: "system",
        content: systemPrompt
      }
    ];

    if (imageData) {
      let imageQuery = "What landmark or tourist attraction is shown in this image? Please identify it and provide interesting information about it.";
      
      if (location) {
        imageQuery += ` The photo was taken at GPS coordinates: ${location.latitude}°, ${location.longitude}°. Please verify the landmark identification matches this location and mention if there are any discrepancies.`;
      }
      
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: imageQuery
          },
          {
            type: "image_url",
            image_url: {
              url: imageData
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: `Tell me about ${query}. Provide detailed, engaging information with historical context and visitor tips.`
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        analysis,
        confidence: imageData ? 0.85 : 0.95 // Higher confidence for text queries
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-landmark:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});