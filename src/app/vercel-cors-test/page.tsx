"use client";

import { useState } from "react";
import { testVercelCors } from "@/utils/test-vercel-cors";

export default function VercelCorsTestPage() {
  const [token, setToken] = useState("");
  const [projectId, setProjectId] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    if (!token || !projectId) {
      alert("Please provide both a token and a project ID.");
      return;
    }

    setLoading(true);
    setResult("Testing CORS direct fetch to Vercel...");

    try {
      const res = await testVercelCors(token, projectId);
      setResult(res);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto mt-20 bg-white border rounded shadow">
      <h1 className="text-2xl font-bold mb-2 text-black">Vercel CORS Test</h1>
      <p className="text-gray-600 mb-6">
        This page is isolated for testing. It sends a direct browser fetch to
        Vercel&apos;s API to check if they allow Cross-Origin Resource Sharing.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vercel Access Token
          </label>
          <input
            type="password"
            placeholder="e.g. A1b2C3d4E5..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vercel Project ID
          </label>
          <input
            type="text"
            placeholder="e.g. prj_1234567890abcdef..."
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-medium disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test CORS"}
        </button>

        {result !== null && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Result:</h3>
            <pre className="p-4 bg-gray-100 rounded overflow-auto text-xs text-black border border-gray-200">
              {typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
