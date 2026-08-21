import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://olnhbvrxkkksllfujsvi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Yo2ZGRK2n970tjkw14iAgA_sCGAWfqr"; // Your anon/publishable key

const MY_USER_ID = "073ea459-d365-4954-8cd5-6d57adb6fe58";
const OTHER_USER_ID = "00e92ca7-3155-4739-90bc-a090e6ef0117";

// Always generates the same name regardless of who is A/B
const channelName = [MY_USER_ID, OTHER_USER_ID].sort().join("_");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Channel:", channelName);

supabase
  .channel(channelName)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "Message",
    },
    (payload) => {
      // Only handle messages belonging to these two users
      const message = payload.new;

      const isOurChat =
        [message.senderId, message.reciverId].sort().join("_") === channelName;

      if (!isOurChat) return;

      console.log("📩 MESSAGE:");
      console.log("From:", message.senderId);
      console.log("To:", message.reciverId);
      console.log("Text:", message.text);
    },
  )
  .subscribe((status) => {
    console.log("STATUS:", status);
  });
