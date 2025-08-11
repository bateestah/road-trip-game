import { NextResponse } from "next/server";
import { beginAuth } from "@/lib/auth";

export async function GET() {
  const url = await beginAuth();
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" }});
}
