/// <reference types="@cloudflare/workers-types" />

export interface Env {
  CRON_SECRET: string;
  NEXT_PUBLIC_APP_URL: string; // The production URL of your app
}

const worker = {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const url = new URL("/api/cron/digest", env.NEXT_PUBLIC_APP_URL);
    
    // Add the secret just like Vercel did
    url.searchParams.set("secret", env.CRON_SECRET);
    
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Cloudflare-Cron-Worker",
      },
    });

    if (!response.ok) {
      console.error(`Cron failed with status ${response.status}: ${await response.text()}`);
    } else {
      console.log(`Cron succeeded. Status: ${response.status}`);
    }
  },
};

export default worker;
