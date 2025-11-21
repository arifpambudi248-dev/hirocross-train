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
    const { athleteData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from athlete data
    const context = `
Data Atlet:
- Nama: ${athleteData.name}
- Readiness Score (7 hari terakhir): ${athleteData.readinessScores?.join(', ') || 'Tidak ada data'}
- Rata-rata Readiness: ${athleteData.avgReadiness || 'N/A'}%
- Injury Risk Level: ${athleteData.injuryRisk || 'Unknown'}
- Risk Score: ${athleteData.riskScore || 'N/A'}/100
- ACWR: ${athleteData.acwr || 'N/A'}
- Beban Latihan Minggu Ini: ${athleteData.currentWeekLoad || 0} AU
- Beban Latihan 4 Minggu Terakhir: ${athleteData.weeklyLoads?.join(', ') || 'Tidak ada data'}
- Hasil Tes Fisik Terbaru:
${athleteData.physicalTests?.map((test: any) => `  - ${test.test_name}: ${test.value} ${test.unit}`).join('\n') || '  Tidak ada data tes'}

Risk Factors:
${athleteData.riskFactors?.map((factor: any) => 
  `- ${factor.factor}: ${factor.value} (${factor.severity}) - ${factor.description}`
).join('\n') || 'Tidak ada data'}
`;

    const systemPrompt = `Kamu adalah AI Coach profesional untuk atlet sepak bola. Tugasmu adalah memberikan feedback dan rekomendasi personal yang actionable berdasarkan data atlet.

Analisis data yang diberikan dan berikan:
1. Assessment kondisi atlet saat ini (2-3 kalimat)
2. 3-4 rekomendasi spesifik dan actionable untuk latihan minggu depan
3. 1-2 warning jika ada red flags dalam data
4. Motivasi dan insight untuk meningkatkan performa

Gunakan bahasa yang friendly tapi profesional. Fokus pada practical advice yang bisa langsung diterapkan. Hindari jargon teknis yang berlebihan.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, silakan coba lagi nanti." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Kredit AI habis, silakan top up di workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const feedback = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
