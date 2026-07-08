export default function ExclusaoPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.8, color: "#1f2937" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Instruções para Exclusão de Dados</h1>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>Última atualização: 30 de junho de 2026</p>
      <p>Em conformidade com a <strong>LGPD</strong>, você pode solicitar a exclusão completa dos seus dados.</p>

      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>Opção 1 — Exclusão via Plataforma</h2>
      <p>Acesse <strong>Configurações → Excluir Conta</strong> dentro do CRM. Processado em até 30 dias.</p>

      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>Opção 2 — Solicitação por E-mail</h2>
      <p>Envie para <strong>contato@coexsistemas.techvoz.com.br</strong> com:</p>
      <ul style={{ margin: "0.5rem 0 1rem 1.5rem" }}>
        <li>Assunto: "Solicitação de Exclusão de Dados"</li>
        <li>Nome completo, e-mail e telefone cadastrados</li>
      </ul>

      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>O Que Será Excluído</h2>
      <ul style={{ margin: "0.5rem 0 1rem 1.5rem" }}>
        <li>Perfil, contatos, conversas, mensagens e mídias</li>
        <li>Automações, fluxos e relatórios</li>
      </ul>

      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>Prazo</h2>
      <p>Processamento em até <strong>30 dias</strong>. Confirmação enviada por e-mail.</p>

      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>Contato</h2>
      <p><strong>contato@coexsistemas.techvoz.com.br</strong></p>
    </div>
  )
}
