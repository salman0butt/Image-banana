import { NextResponse } from "next/server";

import { getCreditBalance } from "@/lib/credits";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = !claimsError && typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  try {
    const balance = await getCreditBalance(userId);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Unable to load credit balance:", error);
    return NextResponse.json(
      {
        error: {
          code: "CREDIT_BALANCE_FAILED",
          message: "Unable to load the credit balance.",
        },
      },
      { status: 500 },
    );
  }
}
