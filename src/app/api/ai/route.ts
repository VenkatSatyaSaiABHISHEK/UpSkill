import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API key not configured on server" }, { status: 500 });
    }

    const { action, payload } = await req.json();

    if (!action || !payload) {
      return NextResponse.json({ error: "Missing action or payload parameters" }, { status: 400 });
    }

    let prompt = "";
    const systemInstruction = "You are an expert AI mentor and software coach for trainees in an upskill program. Keep all answers professional, encouraging, concise, and technically accurate.";

    switch (action) {
      case "summarize":
        prompt = `Provide a concise 1-2 sentence professional summary of this learning log: "${payload}"`;
        break;
      case "autofill":
        prompt = `You are an AI assistant helping a student write their daily learning summary. 
The student has provided the following brief notes: "${payload}".

Follow these instructions strictly:
1. If the notes are gibberish, random letters (e.g. "qwertyui", "asdfgh", "xyz"), or have no meaningful learning content, reply exactly with: "Please enter brief notes about what you studied today (e.g. 'python 1 to 5 programs written') so I can autofill a summary for you."
2. Otherwise, write a clear, concise, professional learning summary in the first person ("I learned...", "I practiced...", "Today I worked on...") based ONLY on the provided notes.
3. Keep it grounded: do NOT hallucinate, invent, or make up any technical concepts, tools, or libraries that are not explicitly mentioned or clearly implied by their notes. For example, if they say "python 1 to 5 problem i writen", rewrite it as: "Today I practiced Python programming and successfully wrote and tested programs 1 to 5."
4. Return ONLY the raw rewritten text. Do NOT include any quotation marks, introductory text, explanations, or remarks.`;
        break;
      case "rewrite":
        prompt = `Rephrase these notes and roadblocks into a highly professional, constructive statement suitable for a manager/mentor review: "${payload}".
CRITICAL: Return ONLY the raw rewritten text. Do NOT include any introduction, explanations, quotes, or conversational remarks.`;
        break;
      case "tips":
        prompt = `Based on the session topic: "${payload}", suggest 3 targeted study tips, key search terms, or recommended concepts they should review next.`;
        break;
      case "weeklySummary":
        prompt = `Here is a list of learning updates submitted by a student this week:\n\n${payload}\n\nGenerate a brief, professional weekly progress wrap-up (2 sentences max) highlighting what they accomplished and what they should focus on next week.`;
        break;
      default:
        return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Groq API request failed");
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "No result generated.";

    return NextResponse.json({ success: true, text: resultText.trim() });
  } catch (error: unknown) {
    console.error("Groq API route exception:", error);
    const message = error instanceof Error ? error.message : "AI processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
