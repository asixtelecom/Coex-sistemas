import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { conversation_id, content_text, reply_to_message_id } = await request.json();

    if (!conversation_id || !content_text) {
      return NextResponse.json(
        { error: "Missing conversation_id or content_text" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get conversation with contact and channel
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*, contact:contacts(*), channel:channels(*)")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    if (conversation.channel?.type !== "webchat") {
      return NextResponse.json(
        { error: "Not a webchat conversation" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Insert message into database
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_type: "agent",
      content_type: "text",
      content_text,
      channel_id: conversation.channel_id,
      status: "sent",
      reply_to_message_id,
    });

    if (msgError) {
      return NextResponse.json(
        { error: "Failed to save message" },
        { status: 500, headers: corsHeaders },
      );
    }

    // Update conversation last message
    await supabase
      .from("conversations")
      .update({
        last_message_text: content_text,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    // TODO: Implement realtime push to widget (using Supabase realtime or other method)
    // For now, the widget will need to poll or listen for realtime changes

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("Webchat send error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
