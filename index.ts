/*
Copyright (C) 2025 Arvensis Systems LLC

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import OpenAI from "openai";
import prompt from "./prompt";
import { Client, Events, GatewayIntentBits } from "discord.js";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_TOKEN,
  defaultHeaders: {
    "HTTP-Referer": "https://arvensis.systems", // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "Arvensis Systems", // Optional. Site title for rankings on openrouter.ai.
  },
});

async function check(message: string): Promise<boolean> {
  const completion = await openai.chat.completions.create({
    model: "google/gemma-2-27b-it",
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  return completion.choices[0].message.content?.trim() == "A";
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (m) => {
  if (m.channelId != process.env.CHANNEL_ID) return;
  if (m.author.bot) return;
  try {
    const allowed = await check(m.content);

    if (allowed) {
      await m.member?.roles.add(process.env.ROLE_ID ?? "");
      await m.react("✅");
    } else {
      await m.react("❌");
    }
  } catch (e) {
    console.log(e);
    // no await since we dont want a reject to error
    m.react("⚠️");
  }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
