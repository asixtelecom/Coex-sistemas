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
    const { token, text, sender_name, visitor_id, phone } = await request.json();

    if (!token || !text) {
      return NextResponse.json(
        { error: "Missing token or text" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Clean phone number: remove non-digit characters
    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("*, account:accounts(owner_user_id)")
      .eq("type", "webchat")
      .eq("id", token)
      .maybeSingle();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Find existing contact
    let contact: any = null;
    
    // First, try to find by cleaned real phone number if provided
    if (cleanPhone) {
      const { data: contactByPhone } = await supabase
        .from("contacts")
        .select("*")
        .eq("account_id", channel.account_id)
        .eq("phone", cleanPhone)
        .maybeSingle();
      
      if (contactByPhone) {
        contact = contactByPhone;
      }
    }
    
    // If not found by phone, try by visitor_id
    if (!contact && visitor_id) {
      const { data: contactByVisitor } = await supabase
        .from("contacts")
        .select("*")
        .eq("account_id", channel.account_id)
        .eq("phone", visitor_id)
        .maybeSingle();
      
      if (contactByVisitor) {
        contact = contactByVisitor;
        
        // If we have a real phone number now, update the contact
        if (cleanPhone && cleanPhone !== visitor_id) {
          const { error: updateError } = await supabase
            .from("contacts")
            .update({ phone: cleanPhone, name: sender_name || contact.name })
            .eq("id", contact.id);
          
          if (updateError) {
            console.error("Failed to update contact phone:", updateError);
          } else {
            // Update local contact object with new phone
            contact.phone = cleanPhone;
          }
        }
      }
    }
    
    let contactId: string;
    if (contact) {
      contactId = contact.id;
    } else {
      // Create new contact
      const finalPhone = cleanPhone || visitor_id || `webchat-${token}-${Date.now()}`;
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          account_id: channel.account_id,
          user_id: channel.account.owner_user_id,
          phone: finalPhone,
          name: sender_name || "Webchat Visitor",
        })
        .select()
        .maybeSingle();

      if (!newContact) {
        return NextResponse.json(
          { error: "Failed to create contact" },
          { status: 500, headers: corsHeaders },
        );
      }
      contactId = newContact.id;
    }

    // Find existing conversation
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .eq("account_id", channel.account_id)
      .eq("contact_id", contactId)
      .eq("channel_id", channel.id)
      .maybeSingle();

    let conversationId: string;
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          account_id: channel.account_id,
          user_id: channel.account.owner_user_id,
          contact_id: contactId,
          channel_id: channel.id,
          status: "open",
        })
        .select()
        .maybeSingle();

      if (!newConv) {
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500, headers: corsHeaders },
        );
      }
      conversationId = newConv.id;
    }

    // Insert message
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "customer",
      sender_id: contactId,
      content_type: "text",
      content_text: text,
      channel_id: channel.id,
      status: "delivered",
    });

    if (msgError) {
      return NextResponse.json(
        { error: "Failed to save message" },
        { status: 500, headers: corsHeaders },
      );
    }

    // Update conversation last message and unread count
    await supabase
      .from("conversations")
      .update({
        last_message_text: text,
        last_message_at: new Date().toISOString(),
        unread_count: (existingConv?.unread_count || 0) + 1,
      })
      .eq("id", conversationId);

    return NextResponse.json(
      { success: true, conversation_id: conversationId },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("Webchat message error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
