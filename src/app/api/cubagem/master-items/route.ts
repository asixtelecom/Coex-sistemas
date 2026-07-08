import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  let query = supabase
    .from('cubagem_master_items')
    .select('*')
    .order('item_name', { ascending: true });

  if (q.trim()) {
    query = query.ilike('item_name', `%${q}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_name, default_m3, item_value } = body;

    if (!item_name || !item_name.trim()) {
      return NextResponse.json({ error: 'Nome do item é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cubagem_master_items')
      .insert({
        item_name: item_name.trim(),
        default_m3: Number(default_m3) || 0,
        item_value: Number(item_value) || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
