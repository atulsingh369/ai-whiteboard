import { NextResponse } from "next/server";
import { signOutServerSide } from "@/lib/auth";

export async function GET(request: Request) {
  await signOutServerSide();
  return NextResponse.redirect(new URL("/login", request.url));
}
