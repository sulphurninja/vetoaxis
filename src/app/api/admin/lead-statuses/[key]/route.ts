import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import Lead from "@/models/Lead";
import LeadStatus from "@/models/LeadStatus";
import { isValidStatusKey, listLeadStatuses, statusKeyFromName } from "@/lib/lead-statuses";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await dbConnect();
    const decoded = getAuthToken(request);
    if (!decoded || typeof decoded !== "object") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    if (decoded.role !== "super_admin") {
      return NextResponse.json({ message: "Only a super admin can update statuses." }, { status: 403 });
    }

    const current = statusKeyFromName(decodeURIComponent((await params).key));
    const body = await request.json();
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const nextKey = statusKeyFromName(typeof body.key === "string" && body.key.trim() ? body.key : current);
    if (!label || !isValidStatusKey(current) || !isValidStatusKey(nextKey)) {
      return NextResponse.json({ message: "Enter a status name using letters, numbers, or hyphens." }, { status: 400 });
    }

    const status = await LeadStatus.findOne({ key: current });
    if (!status) return NextResponse.json({ message: "Status not found." }, { status: 404 });

    if (nextKey !== current) {
      const clash = await LeadStatus.findOne({ key: nextKey });
      if (clash) return NextResponse.json({ message: "That status already exists." }, { status: 409 });
      await Lead.updateMany({ status: current }, { $set: { status: nextKey } });
      await Lead.updateMany({ "statusHistory.fromStatus": current }, { $set: { "statusHistory.$[entry].fromStatus": nextKey } }, { arrayFilters: [{ "entry.fromStatus": current }] });
      await Lead.updateMany({ "statusHistory.toStatus": current }, { $set: { "statusHistory.$[entry].toStatus": nextKey } }, { arrayFilters: [{ "entry.toStatus": current }] });
      status.key = nextKey;
    }
    status.label = label;
    await status.save();

    return NextResponse.json({ statuses: await listLeadStatuses() });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ message: "That status already exists." }, { status: 409 });
    }
    console.error("Error updating status:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
