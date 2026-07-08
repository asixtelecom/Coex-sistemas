export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.8, color: "#1f2937" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>Política de Privacidade</h1>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>Última atualização: 30 de junho de 2026</p>
      <p>A <strong>Coex Sistemas</strong> está comprometida com a proteção da sua privacidade. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações pessoais dos usuários do nosso CRM WhatsApp.</p>
      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>1. Informações que Coletamos</h2>
      <p>Coletamos as seguintes informações para operar o serviço:</p>
      <ul style={{ margin: "0.5rem 0 1rem 1.5rem" }}>
        <li><strong>Dados de conta:</strong> nome, e-mail e telefone do usuário.</li>
        <li><strong>Dados de contato:</strong> nome, telefone, e-mail e outras informações de contato dos clientes gerenciados através da plataforma.</li>
        <li><strong>Mensagens:</strong> conteúdo das mensagens trocadas via WhatsApp Business API.</li>
        <li><strong>Dados de uso:</strong> logs de acesso, endereço IP e informações sobre interações com a plataforma.</li>
      </ul>
      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>2. Como Usamos as Informações</h2>
      <p>Utilizamos as informações coletadas para operar, manter e melhorar a plataforma, processar mensagens do WhatsApp, fornecer suporte técnico e cumprir obrigações legais.</p>
      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>3. Compartilhamento de Informações</h2>
      <p>Não vendemos ou compartilhamos informações pessoais com terceiros, exceto com provedores de serviços essenciais, quando exigido por lei ou para proteger nossos direitos.</p>
      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>4. Segurança dos Dados</h2>
      <p>Implementamos medidas de segurança incluindo criptografia AES-256 GCM para tokens de acesso.</p>
      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>5. Retenção de Dados</h2>
      <p>Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento, os dados são excluídos em até 90 dias.</p>
      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>6. Seus Direitos</h2>
      <p>Você tem direito a acessar, corrigir ou excluir seus dados pessoais, solicitar portabilidade e revogar o consentimento. Para exclusão, acesse <a href="/exclusao-de-dados">exclusao-de-dados</a>.</p>
      <h2 style={{ fontSize: "1.2rem", marginTop: "1.8rem", marginBottom: "0.6rem" }}>7. Contato</h2>
      <p><strong>contato@coexsistemas.techvoz.com.br</strong></p>
    </div>
  )
}
