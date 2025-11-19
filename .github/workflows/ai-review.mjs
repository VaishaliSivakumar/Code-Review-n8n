import fetch from "node-fetch";

async function runReview() {
  const token = process.env.GITHUB_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;

  const prNumber = process.env.PR_NUMBER;
  const repo = process.env.GITHUB_REPOSITORY;

  const [owner, repoName] = repo.split("/");

  console.log("🔍 Fetching PR changed files...");

  // Fetch changed files from GitHub
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}/files`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const files = await res.json();
  let diffText = files.map(f => f.patch).join("\n");

  console.log("🤖 Asking Gemini for review...");

  // Send to Gemini API
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: {
          text: "You are a strict senior code reviewer. Review this code diff:\n" + diffText
        }
      })
    }
  );

  const geminiResult = await geminiRes.json();
  const review = geminiResult.candidates?.[0]?.outputText || "No review generated.";

  console.log("💬 Posting review to PR...");

  // Post review comment
  await fetch(`https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body: review })
  });

  console.log("✅ Review posted successfully!");
}

runReview().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
