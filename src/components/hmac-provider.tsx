"use client";

import { useEffect } from "react";
import { generateHmacSignature } from "@/lib/hmac";

export function HmacProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            let [resource, config] = args;

            // Ensure config object exists
            config = config || {};

            // Only sign mutating requests
            const method = (config.method || "GET").toUpperCase();
            if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
                const timestamp = Date.now().toString();
                const secret = process.env.NEXT_PUBLIC_HMAC_SECRET || "default_dev_secret_so_it_works";

                // Extract payload
                let payload = "";
                if (config.body) {
                    if (typeof config.body === "string") {
                        payload = config.body;
                    } else if (config.body instanceof FormData || config.body instanceof URLSearchParams) {
                        // For complex bodies, we might not easily stringify without altering original Request setup
                        // In Next.js Server Actions, Next passes heavily encoded FormData or strings.
                        // For simple implementation, stringify if possible or just use a placeholder for FormData.
                        // Ideally URLSearchParams can be toString()
                        if (config.body instanceof URLSearchParams) {
                            payload = config.body.toString();
                        } else {
                            // Note: strictly signing FormData requires intercepting the stream/boundary,
                            // which is complex. For FormData, we might just sign an empty string and rely
                            // on the timestamp to prevent replays, but this lowers the integrity check.
                            payload = "";
                        }
                    } else {
                        // Unhandled body types (Blob, ArrayBuffer, etc)
                        payload = "";
                    }
                }

                try {
                    const signature = await generateHmacSignature(payload, timestamp, secret);

                    // Add headers
                    const headers = new Headers(config.headers || {});
                    headers.set("X-Timestamp", timestamp);
                    headers.set("X-Signature", signature);

                    config.headers = headers;
                } catch (error) {
                    console.error("Failed to generate HMAC signature:", error);
                }
            }

            return originalFetch(resource, config);
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return <>{children}</>;
}
