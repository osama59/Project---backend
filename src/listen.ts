import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://olnhbvrxkkksllfujsvi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Yo2ZGRK2n970tjkw14iAgA_sCGAWfqr"; // Your anon/publishable key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("🔌 Connecting to Supabase Realtime...");

supabase
  .channel("db-messages")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "Message" },
    (payload) => {
      console.log("\n📩 LIVE MESSAGE RECEIVED:");
      console.log(`From : ${payload.new.senderId}`);
      console.log(`To   : ${payload.new.reciverId}`);
      console.log(`Text : ${payload.new.text}`);
      console.log("-----------------------------------------");
    }
  )
  .subscribe((status) => {
    console.log(`Status: ${status}`);
  });


  