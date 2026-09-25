import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const IIDX_FINAL = "d5985402-94a4-4e70-91b4-f6bcb74feccc";
const SDVX_FINAL = "3ee6c392-963f-40c7-a5df-370d7be45c9e";
const DDR_SEMI1 = "3f688eb5-b8bb-474e-9982-e4c1618f1f3e";

async function inspect(matchId: string, label: string) {
  console.log(`\n=== ${label} ===`);
  const { data: rounds } = await supabase.from("match_rounds").select("*").eq("match_id", matchId).order("round_number");
  for (const r of rounds ?? []) {
    const { data: betTypes } = await supabase.from("bet_types").select("id,type_key,label").eq("round_id", r.id);
    const info: any[] = [];
    for (const bt of betTypes ?? []) {
      const { count } = await supabase.from("bet_options").select("id", { count: "exact", head: true }).eq("bet_type_id", bt.id);
      info.push(`${bt.type_key}(${count}択)`);
    }
    const { count: songCount } = await supabase.from("tag_battle_songs").select("id", { count: "exact", head: true }).eq("round_id", r.id);
    console.log(`  round_number=${r.round_number} label=${r.round_label} format=${r.round_format} betTypes=[${info.join(",")}] songs=${songCount}`);
  }
}

async function main() {
  await inspect(IIDX_FINAL, "IIDX Final (round8 + Final)");
  await inspect(SDVX_FINAL, "SDVX Final");
  await inspect(DDR_SEMI1, "DDR Semi1");
}
main();
