"use client";

import { useEffect, useState } from "react";

export default function DropboxCallbackPage() {
  const [status, setStatus] = useState("Authorizing Dropbox...");

  useEffect(() => {
    (async () => {
      const { dropboxAuth } = await import("@/lib/cloud/dropbox/auth");
      const { notifyOpener } = await import("@/lib/cloud/oauth-core");
      const ok = await dropboxAuth.handleCallback();
      notifyOpener("dropbox-auth-complete", ok);

      if (window.opener) {
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
