"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createPosition,
  updatePositionStatus,
  closePosition,
  updateTrailingStop,
  removeTrailingStop,
  type CreatePositionData,
  type PositionLeg,
} from "@/lib/db/positions";

export async function createPositionAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const symbol = formData.get("symbol") as string;
  const strategy = formData.get("strategy") as CreatePositionData["strategy"];
  const notes = formData.get("notes") as string | null;
  const legsJson = formData.get("legs") as string;

  if (!symbol || !strategy || !legsJson) {
    throw new Error("Missing required fields");
  }

  const legs: PositionLeg[] = JSON.parse(legsJson);

  await createPosition(user.id, {
    symbol: symbol.toUpperCase().trim(),
    strategy,
    entry_date: new Date().toISOString().split("T")[0],
    notes: notes?.trim() || undefined,
    legs,
  });

  revalidatePath("/positions");
  redirect("/positions");
}

export async function updateStatusAction(
  positionId: string,
  status: "active" | "closed" | "rolled"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await updatePositionStatus(positionId, status);
  revalidatePath("/positions");
  revalidatePath(`/positions/${positionId}`);
}

export async function closePositionAction(positionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await closePosition(positionId);
  revalidatePath("/positions");
  revalidatePath(`/positions/${positionId}`);
}

export async function setTrailingStopAction(
  positionId: string,
  trailingStopPct: number,
  currentPrice: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await updateTrailingStop(positionId, trailingStopPct, currentPrice, currentPrice);
  revalidatePath("/positions");
  revalidatePath(`/positions/${positionId}`);
  revalidatePath("/risk");
}

export async function removeTrailingStopAction(positionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await removeTrailingStop(positionId);
  revalidatePath("/positions");
  revalidatePath(`/positions/${positionId}`);
  revalidatePath("/risk");
}
