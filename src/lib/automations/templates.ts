import type {
  AutomationStepConfig,
  AutomationStepType,
  AutomationTriggerConfig,
  AutomationTriggerType,
} from '@/types'

export type TemplateSlug =
  | 'welcome_message'
  | 'out_of_office'
  | 'lead_qualifier'
  | 'follow_up_reminder'
  | 'boas_vindas'
  | 'horario_comercial'
  | 'solicitar_orcamento'
  | 'acompanhamento'

export interface TemplateStepSeed {
  step_type: AutomationStepType
  step_config: AutomationStepConfig
  branch?: 'yes' | 'no' | null
  /** Index (within this seed list) of the Condition parent, if nested. */
  parent_index?: number | null
}

export interface AutomationTemplateDefinition {
  slug: TemplateSlug
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: AutomationTriggerConfig
  steps: TemplateStepSeed[]
}

export const AUTOMATION_TEMPLATES: Record<TemplateSlug, AutomationTemplateDefinition> = {
  welcome_message: {
    slug: 'welcome_message',
    name: 'Welcome Message',
    description: 'Auto-reply to first-time contacts with a greeting.',
    // first_inbound_message (added in PR #33) catches both brand-new
    // contacts AND manually-added/imported contacts on their first-ever
    // reply, which is what a user setting up a "welcome" automation
    // almost always wants. new_contact_created would miss the
    // manually-imported case.
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi! 👋 Thanks for reaching out. We'll get back to you shortly.",
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },
  out_of_office: {
    slug: 'out_of_office',
    name: 'Out of Office',
    description: 'Auto-reply during off-hours so nobody is left waiting.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'time_of_day',
          operand: '18:00-09:00',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Thanks for your message! Our team is offline right now (9am–6pm) and will reply first thing tomorrow.",
        },
        parent_index: 0,
        branch: 'yes',
      },
    ],
  },
  lead_qualifier: {
    slug: 'lead_qualifier',
    name: 'Lead Qualifier',
    description: 'Ask qualification questions to filter inbound leads.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['pricing', 'quote', 'buy'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Great — happy to help with pricing! Quick question: roughly how many seats are you looking for?",
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 10, unit: 'minutes' },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  follow_up_reminder: {
    slug: 'follow_up_reminder',
    name: 'Follow-up Reminder',
    description: 'Send a nudge if a contact has not replied within 24 hours.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 1, unit: 'days' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Just circling back — did you have any other questions for us? Happy to help!",
        },
      },
    ],
  },
  boas_vindas: {
    slug: 'boas_vindas',
    name: 'Boas-Vindas',
    description: 'Mensagem automática de boas-vindas para novos contatos em qualquer canal.',
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Olá! 👋 Bem-vindo(a) à Coex Sistemas.\n\n" +
            "Recebemos sua mensagem e em breve um de nossos consultores entrará em contato.\n\n" +
            "Enquanto isso, conte-nos brevemente como podemos ajudar:",
        },
      },
    ],
  },
  horario_comercial: {
    slug: 'horario_comercial',
    name: 'Fora do Expediente',
    description: 'Resposta automática enviada fora do horário comercial (18h–08h).',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'time_of_day',
          operand: '18:00-08:00',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Recebemos sua mensagem! 🕐\n\n" +
            "Nosso horário de atendimento é de segunda a sexta, das 08h às 18h.\n\n" +
            "Assim que voltarmos, responderemos com prioridade. Obrigado pelo contato!",
        },
        parent_index: 0,
        branch: 'yes',
      },
    ],
  },
  solicitar_orcamento: {
    slug: 'solicitar_orcamento',
    name: 'Solicitar Orçamento',
    description: 'Qualificação automática de leads que solicitam orçamento.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['orçamento', 'preço', 'quanto custa', 'valor', 'cotação', 'budget'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Excelente! Vamos preparar um orçamento personalizado para você. 📋\n\n" +
            "Para isso, poderia nos informar:\n\n" +
            "1️⃣ Qual solução tem interesse?\n" +
            "2️⃣ Qual a demanda ou volume esperado?\n" +
            "3️⃣ Um prazo estimado para contratação?",
        },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  acompanhamento: {
    slug: 'acompanhamento',
    name: 'Acompanhamento',
    description: 'Dispara um lembrete se o contato não respondeu em 48h.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 2, unit: 'days' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Olá! Tudo bem? 😊\n\n" +
            "Passando para saber se você ficou com alguma dúvida ou se precisa de mais informações.\n\n" +
            "Estamos à disposição para ajudar no que for preciso!",
        },
      },
    ],
  },
}

export function getTemplate(slug: string): AutomationTemplateDefinition | null {
  return AUTOMATION_TEMPLATES[slug as TemplateSlug] ?? null
}
