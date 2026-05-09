"use client";

import { useEffect, useState } from "react";

export default function GoogleDriveCallbackPage() {
  const [status, setStatus] = useState("Authorizing Google Drive...");

  useEffect(() => {
    (async () => {
      const { googleDriveAuth } = await import("@/lib/cloud/google-drive/auth");
      const ok = await googleDriveAuth.handleCallback();

      if (window.opener) {
        window.opener.postMessage(
          { type: "google-drive-auth-complete", success: ok },
          window.origin,
        );
        window.close();
      } else {
        setStatus(ok ? "Authorized! Redirecting..." : "Authorization failed.");
        setTimeout(() => { window.location.href = "/"; }, 1500);
      }
    })();
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "sans-serif",
      color: "#e0e0e0", background: "#0f0f0f",
    }}>
      <p>{status}</p>
    </div>
  );
}
