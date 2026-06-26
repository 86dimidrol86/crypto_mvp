import { NextResponse } from 'next/server'
import { SECTION_SUMMARIES, HELP_ARTICLES } from '@/lib/help-content'

// POST /api/help/chat — ИИ-консультант платформы РусКрипто
// Body: { message: string, locale: 'ru'|'en', history: [{role, content}] }
//
// Логика:
// 1. Пытаемся использовать z-ai-web-dev-sdk (LLM) если настроен .z-ai-config
// 2. Если SDK недоступен — fallback на умный поиск по статьям справки
//    (ключевые слова → лучшая статья → форматированный ответ)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const message: string = typeof body?.message === 'string' ? body.message : ''
    const locale: 'ru' | 'en' = body?.locale === 'en' ? 'en' : 'ru'
    const rawHistory: Array<{ role?: string; content?: string }> = Array.isArray(body?.history)
      ? body.history
      : []

    if (!message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Попытка использовать LLM (z-ai-web-dev-sdk)
    try {
      const answer = await tryLLM(message, locale, rawHistory)
      if (answer) return NextResponse.json({ answer, locale, source: 'llm' })
    } catch {
      // SDK не настроен или ошибка → fallback на поиск по справке
    }

    // Fallback: умный поиск по статьям справки
    const fallback = searchHelpContent(message, locale)
    return NextResponse.json({ answer: fallback, locale, source: 'fallback' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Help chat error: ${message}` },
      { status: 500 }
    )
  }
}

// ─── LLM через z-ai-web-dev-sdk ─────────────────────────────────────────────
async function tryLLM(
  message: string,
  locale: 'ru' | 'en',
  rawHistory: Array<{ role?: string; content?: string }>
): Promise<string | null> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default

  const sectionLines = (Object.keys(SECTION_SUMMARIES) as Array<keyof typeof SECTION_SUMMARIES>).map(
    (k) => `- ${k}: ${SECTION_SUMMARIES[k][locale]}`
  )
  const sectionsContext = sectionLines.join('\n')

  const systemPrompt =
    locale === 'ru'
      ? `Ты — ИИ-консультант криптобиржи РусКрипто. Отвечай на вопросы пользователя по использованию платформы на русском языке. Платформа включает разделы: спот-торги, маржинальная торговля (плечо до 20x), P2P, кросс-бордер платежи (коридоры RU-CN/AE/TR/IN/KZ/AM), кошелёк, портфель, аналитика, KYC верификация (Госуслуги/ЕСИА, уровни L0/L1/L2), комплаенс (AML, 115-ФЗ, SHAP, SAR, карантин), рынки, новости, безопасность (2FA, anti-phishing).

Контекст по разделам:
${sectionsContext}

Правила ответа:
1. Отвечай кратко (2-5 предложений), по делу, дружелюбно.
2. Используй markdown: **жирный** для ключевых терминов, списки для шагов.
3. Если вопрос не по теме платформы — вежливо верни пользователя к теме.
4. Не выдумывай функции, которых нет в платформе.
5. Для пошаговых инструкций используй нумерованные списки.
6. Никогда не запрашивай пароль, 2FA-код, seed-фразу или другие секретные данные.
7. Не давай финансовых советов — только информацию о функционале платформы.`
      : `You are the AI assistant of the RusKripto crypto exchange. Answer user questions about using the platform in English. The platform includes sections: spot trading, margin trading (up to 20x leverage), P2P, cross-border payments (corridors RU-CN/AE/TR/IN/KZ/AM), wallet, portfolio, analytics, KYC verification (Gosuslugi/ESIA, levels L0/L1/L2), compliance (AML, 115-FZ, SHAP, SAR, quarantine), markets, news, security (2FA, anti-phishing).

Section context:
${sectionsContext}

Response rules:
1. Answer briefly (2-5 sentences), to the point, in a friendly tone.
2. Use markdown: **bold** for key terms, lists for steps.
3. If the question is off-topic, gently steer back to the platform.
4. Do not invent features that are not on the platform.
5. For step-by-step instructions use numbered lists.
6. Never ask for a password, 2FA code, seed phrase or other secret data.
7. Do not give financial advice — only information about the platform's features.`

  const historyMessages = rawHistory
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: (m.content as string).slice(0, 4000),
    }))

  const messages: Array<{ role: 'assistant' | 'user'; content: string }> = [
    { role: 'assistant', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: message.slice(0, 4000) },
  ]

  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  })

  const answer = completion.choices[0]?.message?.content?.trim() || ''
  return answer || null
}

// ─── Fallback: поиск по справке ──────────────────────────────────────────────
// Простое ключевое соответствие: ищет статьи, где встречаются слова из вопроса.
// Возвращает форматированный ответ (определение + как пользоваться + FAQ).
function searchHelpContent(question: string, locale: 'ru' | 'en'): string {
  const q = question.toLowerCase()
  const words = q.split(/\s+/).filter((w) => w.length > 2)

  // Ключевые слова → ID статьи (маппинг на основе help-content)
  const KEYWORD_MAP: Record<string, string[]> = {
    'spot-overview': ['спот', 'spot', 'торг', 'trade', 'ордер', 'order', 'лимит', 'limit', 'маркет', 'market', 'купить', 'продать', 'buy', 'sell'],
    'margin-overview': ['марж', 'margin', 'плечо', 'leverage', 'long', 'short', 'лонг', 'шорт', 'ликвид', 'liquidat'],
    'p2p-overview': ['p2p', 'п2п', 'объявл', 'offer', 'эскроу', 'escrow', 'chat', 'чат'],
    'crossborder-overview': ['кросс', 'cross', 'бордер', 'border', 'коридор', 'corridor', 'перевод', 'transfer', 'международ', 'international', 'cny', 'aed', 'try', 'kzt', 'amd'],
    'wallet-overview': ['кошелёк', 'wallet', 'баланс', 'balance', 'актив', 'asset'],
    'wallet-networks': ['депозит', 'deposit', 'пополн', 'пополнить', 'адрес', 'address', 'qr', 'сеть', 'network', 'trc', 'erc', 'bep', 'вывод', 'withdraw', 'вывести', 'whitelist', '2fa'],
    'portfolio-overview': ['портфел', 'portfolio', 'аллокаци', 'allocation', 'pnl', 'налог', 'tax', '3ндфл', '3-ндфл', 'csv'],
    'analytics-overview': ['аналитик', 'analytics', 'метрик', 'metrics', 'объём', 'volume', 'kpi', 'статистик', 'statistics'],
    'kyc-overview': ['kyc', 'верифик', 'verif', 'госуслуг', 'gosuslugi', 'есиа', 'esia', 'документ', 'document', 'селфи', 'selfie', 'liveness', 'квалифик', 'qualified'],
    'compliance-overview': ['комплаенс', 'compliance', 'aml', 'алерт', 'alert', 'шап', 'shap', 'sar', 'росфинмонитор', 'sanction', 'санкц', 'карантин', 'quarantine', '115-фз'],
    'markets-overview': ['рынок', 'market', 'фаворит', 'favorite', 'price alert', 'цена', 'price'],
    'news-overview': ['новост', 'news', 'анонс', 'announce'],
    'security-overview': ['безопас', 'security', '2fa', 'антифишинг', 'anti-phishing', 'сесси', 'session', 'вход', 'login', 'пароль', 'password'],
  }

  // Подсчёт совпадений для каждой статьи
  const scores: Record<string, number> = {}
  for (const [articleId, keywords] of Object.entries(KEYWORD_MAP)) {
    let score = 0
    for (const kw of keywords) {
      if (q.includes(kw)) score += kw.length > 4 ? 2 : 1
    }
    // Также проверяем отдельные слова вопроса
    for (const w of words) {
      for (const kw of keywords) {
        if (kw.includes(w) || w.includes(kw)) {
          score += 1
          break
        }
      }
    }
    if (score > 0) scores[articleId] = score
  }

  // Найти лучшую статью
  const bestId = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0]

  if (!bestId) {
    // Нет совпадений — общий ответ
    return locale === 'ru'
      ? `Я консультирую по использованию платформы **РусКрипто**. Могу рассказать о:\n\n- **Спот-торги** — покупка/продажа криптовалют\n- **Маржинальная торговля** — торговля с плечом до 20x\n- **P2P** — прямая торговля между пользователями\n- **Кросс-бордер платежи** — международные переводы\n- **Кошелёк** — депозиты и выводы\n- **Портфель** — управление активами и налоги\n- **KYC** — верификация через Госуслуги\n- **Комплаенс** — AML и безопасность\n\nУточните, пожалуйста, какой раздел вас интересует?`
      : `I advise on using the **RusKripto** platform. I can tell you about:\n\n- **Spot trading** — buying/selling crypto\n- **Margin trading** — trading with up to 20x leverage\n- **P2P** — peer-to-peer trading\n- **Cross-border payments** — international transfers\n- **Wallet** — deposits and withdrawals\n- **Portfolio** — asset management and taxes\n- **KYC** — verification via Gosuslugi\n- **Compliance** — AML and security\n\nPlease clarify which section interests you?`
  }

  // Найти статью в HELP_ARTICLES
  const article = (HELP_ARTICLES as any[]).find((a) => a.id === bestId)
  if (!article) {
    return locale === 'ru'
      ? 'Не удалось найти информацию по вашему вопросу. Попробуйте переформулировать или откройте раздел «Справка» в меню.'
      : 'Could not find information on your question. Try rephrasing or open the "Help" section in the menu.'
  }

  // Форматировать ответ
  const title = locale === 'ru' ? article.title.ru : article.title.en
  const definition = locale === 'ru' ? article.definition.ru : article.definition.en
  const howTo = locale === 'ru' ? article.howTo.ru : article.howTo.en
  const faq = article.faq as Array<{ q: { ru: string; en: string }; a: { ru: string; en: string } }>

  const intro =
    locale === 'ru'
      ? `**${title}**\n\n`
      : `**${title}**\n\n`

  const faqBlock =
    faq && faq.length > 0
      ? faq
          .slice(0, 2)
          .map((f) => {
            const q = locale === 'ru' ? f.q.ru : f.q.en
            const a = locale === 'ru' ? f.a.ru : f.a.en
            return `**${q}**\n${a}`
          })
          .join('\n\n')
      : ''

  return `${intro}${definition}\n\n**${locale === 'ru' ? 'Как пользоваться' : 'How to use'}:**\n${howTo}\n\n${faqBlock}`
}
