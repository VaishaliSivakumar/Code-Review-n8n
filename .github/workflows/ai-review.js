import OpenAI from "openai";
import { Octokit } from "@octokit/rest";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function runReview() {
  const { GITHUB_REPOSITORY, GITHUB_REF } = process.env;

  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  const pull_number = parseInt(GITHUB_REF.split("/").pop());

  // Get PR diff
  const diff = fs.readFileSync("./diff.txt", "utf8");

  // Send to OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: "You are an expert code reviewer. Provide clear, concise feedback."
      },
      {
        role: "user",
        content: `Review this pull request diff:\n\n${diff}`
      }
    ]
  });

  const reviewText = response.choices[0].message.content;

  // Post comment to PR
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body: reviewText
  });

  console.log("AI review posted!");
}

runReview();
