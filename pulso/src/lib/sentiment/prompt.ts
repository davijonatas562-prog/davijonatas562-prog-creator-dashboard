/**
 * Instruções do classificador. Texto estável (fica no cache de prompt);
 * o que varia — perfil, exemplos corrigidos e menções — vai na mensagem do usuário.
 */
export const SYSTEM_PROMPT = `Você analisa a reputação pública de pessoas públicas brasileiras (prefeitos, vereadores, deputados, gestores) a partir de publicações públicas.

Para cada menção, classifique o sentimento EM RELAÇÃO À PESSOA MONITORADA (ou à gestão dela), não o humor geral do texto.

Rótulos:
- positive: elogio, apoio ou avaliação favorável à pessoa/gestão.
- negative: crítica, reclamação ou avaliação desfavorável à pessoa/gestão.
- neutral: informativo, sem juízo de valor (ex.: notícia de agenda, aviso de serviço).
- mixed: elogio e crítica relevantes ao mesmo tempo.
- undetermined: não dá para saber com segurança — texto ambíguo, sem relação clara com a pessoa, ironia incerta ou contexto insuficiente.

Regras:
1. Em caso de dúvida, use "undetermined". Prefira admitir incerteza a chutar.
2. Uma crítica não é um ataque: classifique como "negative" com stance "criticism"; não exagere a emoção.
3. Não classifique como positiva ou negativa só porque o texto menciona um partido, ideologia ou adversário político.
4. Entenda português brasileiro informal, gírias e expressões regionais (inclusive da Região Norte). Ex.: "égua", "mermão", "tá de parabéns" (pode ser irônico), "só no papel", "cadê", "show de bola".
5. Ironia e sarcasmo invertem o sentido literal: "parabéns pela rua cheia de buraco" é negativo, com irony=true. Marque sarcasm=true quando a ironia é mordaz/zombeteira.
6. Uma pergunta ou cobrança ("cadê a obra?") é stance "question" e geralmente negative, a menos que seja neutra.
7. Não invente fatos. O campo context descreve só o que está no texto, em uma frase.
8. confidence: 0.9+ só quando o sentido é inequívoco; 0.5–0.7 quando há alguma ambiguidade; abaixo de 0.5 normalmente acompanha "undetermined".
9. topic: um assunto curto em português. Reaproveite exatamente um dos assuntos já usados pela equipe quando couber.
10. Devolva um resultado para CADA menção, com o mesmo id recebido.`;

export interface PromptMention {
  id: string;
  source: string;
  author: string | null;
  text: string;
}

export interface CorrectionExample {
  text: string;
  sentiment: string;
}

export function buildUserMessage(input: {
  profile: { publicName: string; office: string | null; municipality: string | null; state: string | null };
  knownTopics: string[];
  corrections: CorrectionExample[];
  mentions: PromptMention[];
}) {
  const p = input.profile;
  const lines: string[] = [];
  lines.push(
    `Pessoa monitorada: ${p.publicName}${p.office ? `, ${p.office}` : ""}${p.municipality ? ` de ${p.municipality}${p.state ? `/${p.state}` : ""}` : ""}.`,
  );
  if (input.knownTopics.length) lines.push(`Assuntos já usados pela equipe: ${input.knownTopics.join(", ")}.`);
  if (input.corrections.length) {
    lines.push("", "Correções feitas manualmente pela equipe (use como referência de critério):");
    for (const c of input.corrections) lines.push(`- "${c.text.slice(0, 280)}" → ${c.sentiment}`);
  }
  lines.push("", "Menções a classificar:");
  lines.push(
    JSON.stringify(
      input.mentions.map((m) => ({ id: m.id, fonte: m.source, autor: m.author, texto: m.text.slice(0, 2000) })),
      null,
      1,
    ),
  );
  return lines.join("\n");
}
