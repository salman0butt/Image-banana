import { NextResponse } from "next/server";

import {
  DEFAULT_IMAGE_MODEL_ID,
  getPublicImageModelPresets,
} from "@/lib/image-models";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.json({
    defaultModelId: DEFAULT_IMAGE_MODEL_ID,
    models: getPublicImageModelPresets(),
  });
}
