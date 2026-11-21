export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Gunakan metode POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "API key belum dipasang. Tambahkan GEMINI_API_KEY di Environment Variables Vercel."
    });
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const personality = typeof body.personality === "string"
      ? body.personality.slice(0, 1200)
      : "Kamu adalah Alif AI, asisten yang ramah, jelas, dan membantu.";

    if (!messages.length) {
      return res.status(400).json({ error: "Pesan masih kosong." });
    }

    // Keep only recent, valid user/model messages to limit request size.
    const contents = messages.slice(-16)
      .filter(m => m && ["user", "model"].includes(m.role) && typeof m.text === "string")
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text.slice(0, 6000) }]
      }));

    if (!contents.length || contents[contents.length - 1].role !== "user") {
      return res.status(400).json({ error: "Pesan terakhir harus berasal dari pengguna." });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `${personality}\n\nJawab dalam bahasa yang digunakan pengguna. Berikan jawaban yang berguna, jujur, dan aman. Jangan mengaku bisa melakukan hal yang sebenarnya tidak bisa dilakukan.`
            }]
          },
          contents,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || "Penyedia AI sedang bermasalah.";
      return res.status(response.status).json({ error: message });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return res.status(502).json({ error: "AI tidak mengembalikan jawaban. Coba kirim ulang." });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(500).json({ error: "Gagal menghubungi AI. Periksa koneksi lalu coba lagi." });
  }
}
