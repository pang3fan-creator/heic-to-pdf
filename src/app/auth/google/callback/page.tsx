"use client";

import { useEffect, useState } from "react";

export default function GoogleDriveCallbackPage() {
  const [status, setStatus] = useState("Authorizing Google Drive...");

  useEffect(() => {
    (async () => {
      const { googleDriveAuth } = await import("@/lib/cloud/google-drive/auth");
      const { notifyOpener } = await import("@/lib/cloud/oauth-core");
      const ok = await googleDriveAuth.handleCallback();
      notifyOpener("google-drive-auth-complete", ok);

      if (window.opener) {
        window.close();
      } else {
        setStatus(ok ? "Authorized! Redirecting..." : "Authorization failed.");
        setTimeout(() => { window.location.href = ok ? "/?gauth=1" : "/"; }, 1500);
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
