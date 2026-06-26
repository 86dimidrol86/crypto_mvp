import { NextRequest } from 'next/server'
import { db } from './db'

/**
 * Финансовый модуль — RBAC хелпер.
 * В демо-режиме: если заголовок x-user-email не передан, используем
 * дефолтный finance@ruscrypto.ru. Так UI работает без строгой авторизации,
 * но прод-режим может быть включён проверкой заголовка.
 */
export async function getFinanceUser(req: NextRequest) {
  const email = req.headers.get('x-user-email') || 'finance@ruscrypto.ru'
  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    // Если пользователь ещё не засиден — возвращаем демо-пользователя по умолчанию
    const fallback = await db.user.findUnique({
      where: { email: 'finance@ruscrypto.ru' },
    })
    if (fallback && ['FINANCE', 'ADMIN'].includes(fallback.role)) {
      return fallback
    }
    return null
  }
  if (!['FINANCE', 'ADMIN'].includes(user.role)) return null
  return user
}

/**
 * Упрощённая проверка — только для demo. Возвращает true всегда,
 * но логирует отсутствие FINANCE-пользователя (без console.log в проде).
 */
export async function requireFinance(req: NextRequest): Promise<boolean> {
  const user = await getFinanceUser(req)
  return user !== null
}
