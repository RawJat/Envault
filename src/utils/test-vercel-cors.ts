/**
 * Utility script to test Vercel API CORS support directly from the browser.
 * This determines if our frontend can securely push decrypted environment
 * variables directly to Vercel without going through our backend.
 */
export async function testVercelCors(
  vercelAccessToken: string,
  vercelProjectId: string,
) {
  const url = `https://api.vercel.com/v9/projects/${vercelProjectId}/env`;

  console.log(`[CORS Test] Starting direct fetch to ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${vercelAccessToken}`,
      },
      // Forces browser standard secure CORS handshakes.
      mode: "cors",
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        `[CORS Test SUCCESS] API returned ${response.status} ${response.statusText}`,
        data,
      );
      return { success: true, status: response.status, data };
    } else {
      console.error(
        `[CORS Test FAILED] API rejected the request with ${response.status} ${response.statusText}`,
      );
      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
      };
    }
  } catch (error) {
    // Under the hood, browser `fetch` throws a TypeError if a request is blocked by CORS.
    // That means we don't get the server response code at all, just a fatal drop.
    console.error(
      "[CORS Test FATAL ERROR] Browser likely blocked the request due to Vercel CORS policies.",
    );
    console.error("Error specifics:", error);
    return { success: false, error };
  }
}
