import { createClient } from "@/lib/supabase-server";

export type PositionLeg = {
  type: "leaps_call" | "short_call" | "short_put" | "shares" | "long_put";
  strike: number;
  expiry: string; // ISO date string
  entry_price: number;
  quantity?: number;
};

export type CreatePositionData = {
  symbol: string;
  strategy: "PMCC" | "Covered Call" | "Cash-Secured Put" | "The Wheel";
  entry_date?: string;
  notes?: string;
  legs: PositionLeg[];
};

export async function getPositions(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select("*, position_legs(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPosition(positionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select("*, position_legs(*)")
    .eq("id", positionId)
    .single();

  if (error) throw error;
  return data;
}

export async function createPosition(
  userId: string,
  data: CreatePositionData
) {
  const supabase = await createClient();

  // Insert the position
  const { data: position, error: posErr } = await supabase
    .from("positions")
    .insert({
      user_id: userId,
      symbol: data.symbol.toUpperCase(),
      strategy: data.strategy,
      entry_date: data.entry_date,
      notes: data.notes,
    })
    .select()
    .single();

  if (posErr) throw posErr;

  // Insert the legs
  const legs = data.legs.map((leg) => ({
    position_id: position.id,
    type: leg.type,
    strike: leg.strike,
    expiry: leg.expiry,
    entry_price: leg.entry_price,
    quantity: leg.quantity ?? 1,
  }));

  const { data: insertedLegs, error: legErr } = await supabase
    .from("position_legs")
    .insert(legs)
    .select();

  if (legErr) throw legErr;

  return { ...position, position_legs: insertedLegs };
}

export async function updatePositionStatus(
  positionId: string,
  status: "active" | "closed" | "rolled"
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .update({ status })
    .eq("id", positionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function closePosition(positionId: string) {
  return updatePositionStatus(positionId, "closed");
}
