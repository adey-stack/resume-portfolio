// netlify/functions/chat.js
//
// Serverless function — deploys automatically with the site, no separate
// backend hosting needed. Runs on Netlify's infrastructure.
//
// Requires one environment variable set in Netlify:
//   GROQ_API_KEY  →  get a free key at https://console.groq.com

const SYSTEM_PROMPT = `You are a friendly AI assistant embedded on Abhishek Kumar's portfolio website.
Always make clear you are an AI assistant representing Abhishek, not Abhishek himself.
Answer questions about his background using ONLY the information below. Be concise (2-4 sentences unless asked for detail),
warm, and professional. If asked something outside this scope, say you're not sure and suggest they use the contact form
on the site to ask Abhishek directly. Never invent facts not listed here.

ABOUT ABHISHEK KUMAR
- Backend-focused Software Developer (Backend & AI Systems) at Pixel Global, Bokaro, India. Jan 2025 - Present.
- Background: BSc Physics, BBMKU University (2023-2026).
- Core skills: Python, Java, JavaScript, Flask, FastAPI, Node.js, REST APIs, MongoDB, SQL, AWS (basic), Selenium,
  OpenAI API, Google Maps API, Git, Postman, Data Structures & Algorithms (450+ problems solved), DBMS, OS.

WORK EXPERIENCE
- Built a scalable lead extraction system (Python + Selenium), processing 300-500 records per run, cutting manual
  effort by ~90%.
- Designed data pipelines to clean, transform and store scraped data for Excel/API use.
- Built a Google Maps API system fetching 100+ business records per location.
- Designed REST APIs and backend services with Flask/FastAPI.
- Built and deployed hybrid RAG systems combining retrieval pipelines with LLMs.

PROJECTS
1. AI SEO SaaS Platform — production system with 100+ paying users (₹2999/month). Full-stack FastAPI + React + MongoDB.
   Real-time SEO audits, issue detection, and a lead-generation flow. Codebase is private (business use); live demo
   available on pixelglobalit.com.
2. Automated Data Extraction Pipeline — Selenium + Python browser automation scraping clinic/business listings,
   parsed with BeautifulSoup, exported to Excel.
3. Hybrid RAG Website Agent — retrieval-based chatbot backend using vector embeddings + LLM pipeline for real-time
   contextual responses.
4. Gesture-Controlled PC Interface (personal/passion project) — replaces the mouse entirely using MediaPipe's 21-point
   hand landmark model + OpenCV + PyAutoGUI. Move index finger to move cursor (smoothed with a moving-average buffer
   and deadzone filter to kill jitter), pinch thumb+index to click, hold pinch to drag, pinch thumb+middle to
   right-click, two-finger gesture to scroll, and a closed fist pauses/resumes control. Pinch threshold scales with
   hand size so it works at any distance from the camera.

CERTIFICATIONS
- Bhartiya Antariksh Hackathon 2025 (ISRO) — Team Leader, Team VADICA, AI/ML prototype for aerospace applications.
- Deloitte Australia — Data Analytics Job Simulation.
- Oracle Cloud Infrastructure 2025 Certified AI Foundations Associate.

CONTACT
- Email: aby@pixelglobalit.com
- LinkedIn: linkedin.com/in/abhishek-dey-19aa47360
- Location: Bokaro, India`;

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "GROQ_API_KEY is not set in Netlify environment variables." }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const incoming = Array.isArray(payload.messages) ? payload.messages : [];
  // keep only the last 10 turns, and only role/content fields, to bound request size
  const trimmed = incoming.slice(-10).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 2000),
  }));

  if (trimmed.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "No messages provided" }) };
  }

  const groqMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: groqMessages,
        temperature: 0.6,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Groq API error: " + errText.slice(0, 300) }),
      };
    }

    const data = await response.json();
    const reply =
      data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "Sorry, I couldn't generate a response.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error: " + err.message }),
    };
  }
};
