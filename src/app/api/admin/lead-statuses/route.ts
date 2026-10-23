import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import LeadStatus from "@/models/LeadStatus";
import { ensureLeadStatuses, isValidStatusKey, listLeadStatuses, statusKeyFromName } from "@/lib/lead-statuses";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const decoded = getAuthToken(request);
    if (!decoded || typeof decoded !== "object") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (decoded.role !== "super_admin") {
      return NextResponse.json({ message: "Only a super admin can add statuses." }, { status: 403 });
    }

    const body = await request.json();
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const requestedKey = typeof body.key === "string" ? statusKeyFromName(body.key) : "";
    const key = requestedKey || statusKeyFromName(label);
    if (!label || !isValidStatusKey(key)) {
      return NextResponse.json({
        message: "Enter a status name using letters, numbers, or hyphens.",
      }, { status: 400 });
    }

    await ensureLeadStatuses();
    const existing = await LeadStatus.findOne({ key });
    if (existing) {
      return NextResponse.json({ message: "That status already exists." }, { status: 409 });
    }

    const count = await LeadStatus.countDocuments();
    await LeadStatus.create({ key, label, color: "#64748b", sortOrder: count, active: true });
    return NextResponse.json({ statuses: await listLeadStatuses() }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ message: "That status already exists." }, { status: 409 });
    }
    console.error("Error creating status:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
