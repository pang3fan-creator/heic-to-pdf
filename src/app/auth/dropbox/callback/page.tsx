"use client";

import { useEffect, useState } from "react";

export default function DropboxCallbackPage() {
  const [status, setStatus] = useState("Authorizing Dropbox...");

  useEffect(() => {
    (async () => {
      const { dropboxAuth } = await import("@/lib/cloud/dropbox/auth");
      const ok = await dropboxAuth.handleCallback();

      if (window.opener) {
        // Popup mode — send result to parent window and close
        window.opener.postMessage(
          { type: "dropbox-auth-complete", success: ok },
          window.origin,
        );
        window.close();
      } else {
        // Direct navigation fallback — redirect to home
        setStatus(ok ? "Authorized! Redirecting..." : "Authorization failed.");
        setTimeout(() => { window.location.href = "/"; }, 1500);
      }
    })();
  }, []);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontFamily: "sans-serif",
      color: "#e0e0e0",
      background: "#0f0f0f",
    }}>
      <p>{status}</p>
    </div>
  );
}
