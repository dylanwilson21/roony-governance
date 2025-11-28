import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { users, organizations } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, organizationName } = body;

    // Validate input
    if (!email || !password || !name || !organizationName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Create organization
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const organization = await db
      .insert(organizations)
      .values({
        name: organizationName,
        slug: `${slug}-${Date.now()}`,
      })
      .returning();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        role: "admin",
        organizationId: organization[0].id,
      })
      .returning();

    return NextResponse.json({
      message: "User created successfully",
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

