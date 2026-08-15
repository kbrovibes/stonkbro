import { createClient } from "@/lib/supabase-server";

export type TaxPaymentRow = {
  id: string;
  user_id: string;
  tax_year: number;
  paid_date: string; // YYYY-MM-DD
  amount: number;
  note: string | null;
  created_at: string;
};

export async function listTaxPayments(
  userId: string,
  taxYear: number
): Promise<TaxPaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_payments")
    .select("*")
    .eq("user_id", userId)
    .eq("tax_year", taxYear)
    .order("paid_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaxPaymentRow[];
}

export async function insertTaxPayment(
  userId: string,
  payment: {
    tax_year: number;
    paid_date: string;
    amount: number;
    note?: string | null;
  }
): Promise<TaxPaymentRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_payments")
    .insert({
      user_id: userId,
      tax_year: payment.tax_year,
      paid_date: payment.paid_date,
      amount: payment.amount,
      note: payment.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TaxPaymentRow;
}

export async function deleteTaxPayment(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tax_payments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
