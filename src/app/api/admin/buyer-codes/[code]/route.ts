import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import BuyerCode from "@/models/BuyerCode";
import Lead from "@/models/Lead";

const CODE = /^[A-Z0-9-]{1,12}$/;

async function authorize(request: NextRequest) {
  const decoded = getAuthToken(request);
  if (!decoded || typeof decoded !== "object") {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  if (!["admin", "super_admin"].includes(decoded.role as string)) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 403 }) };
  }
  return { decoded };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await dbConnect();
    const auth = await authorize(request);
    if (auth.error) return auth.error;

    const current = decodeURIComponent((await params).code).trim().toUpperCase();
    const body = await request.json();
    const next = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!CODE.test(current) || !CODE.test(next)) {
      return NextResponse.json({ message: "Client code must be a short code like C1 or C6." }, { status: 400 });
    }
    if (next === current) return NextResponse.json({ code: next });

    const clash = await BuyerCode.findOne({ code: next });
    if (clash) return NextResponse.json({ message: "Client code already exists." }, { status: 409 });

    const existing = await BuyerCode.findOne({ code: current });
    if (existing) {
      existing.code = next;
      existing.label = next;
      await existing.save();
    } else {
      const count = await BuyerCode.countDocuments();
      await BuyerCode.create({ code: next, label: next, active: true, sortOrder: count });
    }
    await Lead.updateMany({ buyerCode: current }, { $set: { buyerCode: next } });
    return NextResponse.json({ code: next });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ message: "Client code already exists." }, { status: 409 });
    }
    console.error("Error updating client code:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await dbConnect();
    const auth = await authorize(request);
    if (auth.error) return auth.error;

    const current = decodeURIComponent((await params).code).trim().toUpperCase();
    if (!CODE.test(current)) {
      return NextResponse.json({ message: "Client code must be a short code like C1 or C6." }, { status: 400 });
    }

    await BuyerCode.deleteOne({ code: current });
    await Lead.updateMany({ buyerCode: current }, { $unset: { buyerCode: "" } });
    return NextResponse.json({ code: current });
  } catch (error) {
    console.error("Error deleting client code:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
