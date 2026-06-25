import { NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { SECTION_SUMMARIES } from '@/lib/help-content'

// POST /api/help/chat — ИИ-консультант платформы РусКрипто
// Использует z-ai-web-dev-sdk (backend-only).
// Body: { message: string, locale: 'ru'|'en', history: [{role:'user'|'assistant', content:string}] }
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

    // Краткое описание каждого раздела платформы для системного промпта
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
3. Если вопрос не по теме платформы — вежливо верни пользователя к теме (например: «Я консультирую только по платформе РусКрипто. По этому вопросу могу рассказать, как...»).
4. Не выдумывай функции, которых нет в платформе. Если не уверен — скажи «Уточните, пожалуйста, вопрос».
5. Для пошаговых инструкций используй нумерованные списки.
6. Никогда не запрашивай пароль, 2FA-код, seed-фразу или другие секретные данные.
7. Не давай финансовых советов — только информацию о функционале платформы.`
        : `You are the AI assistant of the RusKripto crypto exchange. Answer user questions about using the platform in English. The platform includes sections: spot trading, margin trading (up to 20x leverage), P2P, cross-border payments (corridors RU-CN/AE/TR/IN/KZ/AM), wallet, portfolio, analytics, KYC verification (Gosuslugi/ESIA, levels L0/L1/L2), compliance (AML, 115-FZ, SHAP, SAR, quarantine), markets, news, security (2FA, anti-phishing).

Section context:
${sectionsContext}

Response rules:
1. Answer briefly (2-5 sentences), to the point, in a friendly tone.
2. Use markdown: **bold** for key terms, lists for steps.
3. If the question is off-topic, gently steer back to the platform (e.g. "I advise only on RusKripto. On this topic I can tell you how...").
4. Do not invent features that are not on the platform. If unsure, say "Could you please clarify the question".
5. For step-by-step instructions use numbered lists.
6. Never ask for a password, 2FA code, seed phrase or other secret data.
7. Do not give financial advice — only information about the platform's features.`

    // Сборка messages: system → history (sanitized) → user
    const historyMessages = rawHistory
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-10) // не более 10 последних сообщений для контекста
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

    if (!answer) {
      return NextResponse.json(
        {
          error:
            locale === 'ru'
              ? 'Извините, не удалось сформировать ответ. Попробуйте переформулировать вопрос.'
              : 'Sorry, could not generate an answer. Please try rephrasing your question.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ answer, locale })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Help chat error: ${message}` },
      { status: 500 }
    )
  }
}
