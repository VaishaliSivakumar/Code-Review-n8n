import { Octokit } from "@octokit/core";
import OpenAI from "openai";
import fs from "fs";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Get repo + PR info from GitHub Actions env
const repo = process.env.GITHUB_REPOSITORY.split("/");
const owner = repo[0];
const repoName = repo[1];
const prNumber = process.env.GITHUB_REF.split("/")[2];

async function runReview() {
  console.log("🔍 Fetching PR changed files...");

  const changes = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
    owner: owner,
    repo: repoName,
    pull_number: prNumber,
  });

  let content = "";

  changes.data.forEach(file => {
    content += `\n\n📝 File: ${file.filename}\n${file.patch}\n`;
  });

  console.log("🤖 Asking AI for review...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a senior frontend engineer. Review code for bugs, performance, readability." },
      { role: "user", content: `Review this code diff:\n${content}` }
    ]
  });

  const reviewComment = response.choices[0].message.content;

  console.log("📌 Review Response:", reviewComment);

  await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
    owner: owner,
    repo: repoName,
    issue_number: prNumber,
    body: `### 🤖 AI Code Review\n\n${reviewComment}`
  });

  console.log("✅ AI Review Completed!");
}

runReview().catch(error => {
  console.error("❌ Error:", error);
  process.exit(1);
});
