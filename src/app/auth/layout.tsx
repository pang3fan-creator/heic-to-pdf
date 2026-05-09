export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{
        margin: 0,
        fontFamily: "system-ui, sans-serif",
        background: "#0f0f0f",
        color: "#e0e0e0",
      }}>
        {children}
      </body>
    </html>
  );
}
