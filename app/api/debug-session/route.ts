import { NextResponse } from "next/server";

export async function GET() {
  // set a test cookie
  const res = NextResponse.json({ ok: true, note: "debug cookie set" });
  res.cookies.set("debug_cookie", "hello", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60
  });
  return res;
}
