import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { listLeadStatuses } from "@/lib/lead-statuses";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const decoded = getAuthToken(request);
    if (!decoded || typeof decoded !== "object") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const statuses = await listLeadStatuses();
    return NextResponse.json({ statuses });
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
