import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ visitor_id: string }> }) {
  const { visitor_id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const since = searchParams.get("since"); // timestamp ISO string

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Find channel
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("*")
      .eq("id", token)
      .eq("type", "webchat")
      .maybeSingle();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Find contact by visitor_id (phone column)
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("account_id", channel.account_id)
      .eq("phone", visitor_id)
      .maybeSingle();

    if (contactError || !contact) {
      return NextResponse.json(
        { messages: [] },
        { headers: corsHeaders },
      );
    }

    // Find conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("account_id", channel.account_id)
      .eq("contact_id", contact.id)
      .eq("channel_id", channel.id)
      .maybeSingle();

    if (convError || !conversation) {
      return NextResponse.json(
        { messages: [] },
        { headers: corsHeaders },
      );
    }

    // Get messages
    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { messages, conversation_id: conversation.id },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("Webchat get messages error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
