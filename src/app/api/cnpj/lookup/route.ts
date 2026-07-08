import { NextResponse } from 'next/server';

interface BrasilApiResponse {
  razao_social: string;
  nome_fantasia: string | null;
  email: string | null;
  ddd_telefone_1: string | null;
  telefone_1: string | null;
  ddd_telefone_2: string | null;
  telefone_2: string | null;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  porte: string | null;
  natureza_juridica: string | null;
  nome_socio: string | null;
  situacao_cadastral: string;
  message?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cnpj = searchParams.get('cnpj')?.replace(/\D/g, '');

  if (!cnpj || cnpj.length !== 14) {
    return NextResponse.json(
      { error: 'CNPJ inválido. Informe 14 dígitos.' },
      { status: 400 },
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 86400 },
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'CNPJ não encontrado' },
          { status: 404 },
        );
      }
      const errorBody = await response.text();
      console.error(`BrasilAPI error: ${response.status} ${errorBody}`);
      return NextResponse.json(
        { error: 'Falha ao consultar CNPJ' },
        { status: response.status },
      );
    }

    const data: BrasilApiResponse = await response.json();

    const telefone =
      data.ddd_telefone_1 && data.telefone_1
        ? `(${data.ddd_telefone_1}) ${data.telefone_1}`
        : data.ddd_telefone_2 && data.telefone_2
          ? `(${data.ddd_telefone_2}) ${data.telefone_2}`
          : null;

    const endereco = [
      data.logradouro,
      data.numero ? `nº ${data.numero}` : '',
      data.complemento,
      data.bairro ? `- ${data.bairro}` : '',
      data.municipio ? `${data.municipio}/${data.uf}` : '',
      data.cep ? `CEP: ${data.cep}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    return NextResponse.json({
      name: data.razao_social || data.nome_fantasia || '',
      fantasy_name: data.nome_fantasia || '',
      email: data.email || '',
      phone: telefone || '',
      address: endereco || '',
    });
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar CNPJ' },
      { status: 500 },
    );
  }
}
