import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CLEAR_PASSWORD = "010101aa";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, channelIds } = body;

    if (password !== CLEAR_PASSWORD) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Get user's account
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.account_id) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const accountId = profile.account_id;

    // Get user's pipelines to unlink conversations from deals
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id")
      .eq("user_id", user.id);

    const pipelineIds = pipelines?.map(p => p.id) || [];

    if (pipelineIds.length > 0) {
      // Unlink conversations from deals
      await supabase
        .from("deals")
        .update({ conversation_id: null })
        .in("pipeline_id", pipelineIds)
        .not("conversation_id", "is", null);
    }

    // Get conversations to delete
    let query = supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id);

    if (channelIds && channelIds.length > 0) {
      query = query.in("channel_id", channelIds);
    }

    const { data: conversations } = await query;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ message: "Nenhuma conversa encontrada", deleted: 0 });
    }

    const conversationIds = conversations.map(c => c.id);

    // Delete messages first
    const { error: msgError } = await supabase
      .from("messages")
      .delete()
      .in("conversation_id", conversationIds);

    if (msgError) {
      console.error("Error deleting messages:", msgError);
      return NextResponse.json({ error: "Erro ao deletar mensagens" }, { status: 500 });
    }

    // Delete conversations
    const { error: convError } = await supabase
      .from("conversations")
      .delete()
      .in("id", conversationIds);

    if (convError) {
      console.error("Error deleting conversations:", convError);
      return NextResponse.json({ error: "Erro ao deletar conversas" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Conversas limpas com sucesso",
      deleted: conversationIds.length,
    });
  } catch (error) {
    console.error("Clear conversations error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Get channels with conversation counts
    const { data: channels } = await supabase
      .from("channels")
      .select("id, type, name, status")
      .order("name");

    // Get conversation counts per channel
    const { data: counts } = await supabase
      .from("conversations")
      .select("channel_id")
      .eq("user_id", user.id);

    const channelCounts: Record<string, number> = {};
    counts?.forEach(c => {
      const chId = c.channel_id || "none";
      channelCounts[chId] = (channelCounts[chId] || 0) + 1;
    });

    const totalConversations = counts?.length || 0;

    return NextResponse.json({
      channels: channels || [],
      channelCounts,
      totalConversations,
    });
  } catch (error) {
    console.error("Get channels error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
