// Расширенный seed — больше пользователей, сделок, истории + чёткие демо-учётки
import { db } from '../src/lib/db'

const PAIRS = ['BTC/RUB', 'ETH/RUB', 'BNB/RUB', 'SOL/RUB', 'XRP/RUB', 'ADA/RUB', 'DOGE/RUB', 'AVAX/RUB']
const BASE_PRICES: Record<string, number> = {
  BTC: 4580000, ETH: 122000, BNB: 42400, SOL: 5100, XRP: 80.3, ADA: 11.1, DOGE: 5.7, AVAX: 482,
}

function randPrice(pair: string): number {
  const base = pair.split('/')[0]
  const p = BASE_PRICES[base] || 1000
  return parseFloat((p * (0.97 + Math.random() * 0.06)).toFixed(2))
}

async function main() {
  console.log('🌱 Расширенный seed РусКрипто...')

  // ─── 3 демо-аккаунта с чёткими ролями ───
  const demoUser = await db.user.upsert({
    where: { email: 'user@ruscrypto.ru' },
    update: { name: 'Иван Иванов', role: 'USER', kycLevel: 2, kycStatus: 'ACTIVE', phone: '+7 (999) 123-45-67' },
    create: {
      email: 'user@ruscrypto.ru',
      name: 'Иван Иванов',
      phone: '+7 (999) 123-45-67',
      kycLevel: 2,
      kycStatus: 'ACTIVE',
      role: 'USER',
      referralCode: 'RU-USER01',
    },
  })

  const adminUser = await db.user.upsert({
    where: { email: 'admin@ruscrypto.ru' },
    update: { name: 'Анна Петрова', role: 'ADMIN', kycLevel: 2, kycStatus: 'ACTIVE' },
    create: {
      email: 'admin@ruscrypto.ru',
      name: 'Анна Петрова',
      kycLevel: 2,
      kycStatus: 'ACTIVE',
      role: 'ADMIN',
      referralCode: 'RU-ADMIN1',
    },
  })

  const complianceUser = await db.user.upsert({
    where: { email: 'compliance@ruscrypto.ru' },
    update: { name: 'Сергей Козлов', role: 'COMPLIANCE', kycLevel: 2, kycStatus: 'ACTIVE' },
    create: {
      email: 'compliance@ruscrypto.ru',
      name: 'Сергей Козлов',
      kycLevel: 2,
      kycStatus: 'ACTIVE',
      role: 'COMPLIANCE',
      referralCode: 'RU-COMP01',
    },
  })

  // Совместимость со старым email
  await db.user.upsert({
    where: { email: 'ivan.ivanov@gosuslugi.ru' },
    update: { name: 'Иван Иванов', role: 'USER', kycLevel: 2, kycStatus: 'ACTIVE' },
    create: {
      email: 'ivan.ivanov@gosuslugi.ru',
      name: 'Иван Иванов',
      kycLevel: 2,
      kycStatus: 'ACTIVE',
      role: 'USER',
      referralCode: 'RU-GOSU01',
    },
  })
  console.log(`  ✓ 4 базовых аккаунта (user/admin/compliance/gosuslugi)`)

  // ─── 25 дополнительных пользователей ───
  const firstNames = ['Алексей', 'Мария', 'Дмитрий', 'Елена', 'Сергей', 'Ольга', 'Андрей', 'Наталья', 'Павел', 'Виктория', 'Михаил', 'Екатерина', 'Игорь', 'Татьяна', 'Роман', 'Юлия', 'Артём', 'Светлана', 'Денис', 'Ирина', 'Максим', 'Анастасия', 'Кирилл', 'Валентина', 'Глеб']
  const lastNames = ['Смирнов', 'Иванова', 'Кузнецов', 'Попова', 'Соколов', 'Лебедева', 'Новиков', 'Козлова', 'Морозов', 'Волкова', 'Васильев', 'Павлова', 'Фёдоров', 'Михайлова', 'Зайцев', 'Семёнова', 'Павлов', 'Егорова', 'Голубев', 'Алексеева']
  const extraUsers = []
  for (let i = 0; i < 25; i++) {
    const fn = firstNames[i % firstNames.length]
    const ln = lastNames[i % lastNames.length]
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@mail.ru`
    const kycLevel = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2
    const u = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `${fn} ${ln}`,
        phone: `+7 (${900 + (i % 99)}) ${100 + i}-${10 + (i % 89)}-${10 + (i % 89)}`,
        kycLevel,
        kycStatus: kycLevel === 2 ? 'ACTIVE' : kycLevel === 1 ? 'DOC_VERIFIED' : 'PHONE_VERIFIED',
        role: 'USER',
        referralCode: `RU-${(1000 + i).toString(36).toUpperCase()}`,
      },
    })
    extraUsers.push(u)
  }
  console.log(`  ✓ 25 дополнительных пользователей`)

  // ─── Балансы для демо-user ───
  const balances = [
    { asset: 'RUB', amount: 1245800 },
    { asset: 'USDT', amount: 2450.75 },
    { asset: 'BTC', amount: 0.1245 },
    { asset: 'ETH', amount: 3.45 },
  ]
  for (const b of balances) {
    await db.balance.upsert({
      where: { userId_asset: { userId: demoUser.id, asset: b.asset } },
      update: { amount: b.amount },
      create: { ...b, userId: demoUser.id },
    })
  }
  // Небольшие балансы для нескольких extra users
  for (let i = 0; i < 10; i++) {
    await db.balance.upsert({
      where: { userId_asset: { userId: extraUsers[i].id, asset: 'RUB' } },
      update: {},
      create: { userId: extraUsers[i].id, asset: 'RUB', amount: Math.floor(50000 + Math.random() * 500000) },
    })
    await db.balance.upsert({
      where: { userId_asset: { userId: extraUsers[i].id, asset: 'USDT' } },
      update: {},
      create: { userId: extraUsers[i].id, asset: 'USDT', amount: parseFloat((Math.random() * 2000).toFixed(2)) },
    })
  }
  console.log(`  ✓ Балансы созданы`)

  // ─── 60 сделок за последние 30 дней ───
  const allUsers = [demoUser, ...extraUsers]
  const tradeCount = await db.trade.count()
  if (tradeCount < 50) {
    const need = 60 - tradeCount
    for (let i = 0; i < need; i++) {
      const pair = PAIRS[i % PAIRS.length]
      const side = Math.random() > 0.5 ? 'buy' : 'sell'
      const price = randPrice(pair)
      const quantity = parseFloat((0.005 + Math.random() * 2).toFixed(4))
      const total = price * quantity
      const fee = total * 0.002
      const u = allUsers[Math.floor(Math.random() * allUsers.length)]
      const daysAgo = Math.floor(Math.random() * 30)
      const createdAt = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 86400000)
      const order = await db.order.create({
        data: {
          userId: u.id,
          pair,
          side,
          type: Math.random() > 0.3 ? 'limit' : 'market',
          price,
          quantity,
          filledQty: quantity,
          status: 'FILLED',
          createdAt,
        },
      })
      await db.trade.create({
        data: { orderId: order.id, userId: u.id, pair, side, price, quantity, total, fee, createdAt },
      })
    }
    console.log(`  ✓ ${need} новых сделок (всего ~60)`)
  } else {
    console.log(`  ✓ Сделок уже достаточно (${tradeCount})`)
  }

  // ─── Транзакции (депозиты/выводы) ───
  const txTypes = [
    { type: 'deposit', asset: 'USDT', amount: 500, status: 'COMPLETED', address: 'TNX9k4p' },
    { type: 'withdrawal', asset: 'RUB', amount: -25000, status: 'COMPLETED' },
    { type: 'deposit', asset: 'ETH', amount: 1.2, status: 'COMPLETED', address: '0x742dL71' },
    { type: 'withdrawal', asset: 'USDT', amount: -300, status: 'PENDING', address: 'TRX2m9z' },
    { type: 'deposit', asset: 'BTC', amount: 0.05, status: 'COMPLETED', address: 'bc1qxy2' },
    { type: 'withdrawal', asset: 'RUB', amount: -80000, status: 'COMPLETED' },
    { type: 'deposit', asset: 'USDT', amount: 1200, status: 'COMPLETED', address: 'TNXabc1' },
  ]
  for (const t of txTypes) {
    await db.transaction.create({ data: { ...t, userId: demoUser.id } })
  }
  console.log(`  ✓ ${txTypes.length} транзакций`)

  // ─── P2P офферы (18) ───
  const users = ['CryptoKing', 'RubTrader', 'FastP2P', 'SberExchange', 'TinkoffPro', 'QuickSwap']
  const methods = ['СБП', 'Тинькофф', 'Сбер', 'СБП + Тинькофф']
  const existingOffers = await db.p2POffer.count()
  if (existingOffers < 10) {
    for (let i = 0; i < 18; i++) {
      const type = Math.random() > 0.5 ? 'buy' : 'sell'
      const price = parseFloat((92 + Math.random() * 2.5).toFixed(2))
      const amount = Math.floor(Math.random() * 8000) + 200
      await db.p2POffer.create({
        data: {
          userId: demoUser.id,
          type,
          asset: 'USDT',
          fiat: 'RUB',
          price,
          amount,
          method: methods[i % methods.length],
          minLimit: 1000,
          maxLimit: 200000,
          completed: Math.floor(Math.random() * 400) + 15,
          active: true,
        },
      })
    }
    console.log(`  ✓ 18 P2P офферов`)
  } else {
    console.log(`  ✓ P2P офферы уже есть (${existingOffers})`)
  }

  // ─── P2P сделки ───
  const firstOffer = await db.p2POffer.findFirst({ where: { userId: demoUser.id } })
  if (firstOffer) {
    await db.p2PDeal.create({ data: { offerId: firstOffer.id, buyerId: demoUser.id, asset: 'USDT', amount: 500, price: 93.7, total: 46850, paymentMethod: 'СБП', status: 'PENDING' } })
    await db.p2PDeal.create({ data: { offerId: firstOffer.id, buyerId: demoUser.id, asset: 'USDT', amount: 300, price: 94.2, total: 28260, paymentMethod: 'Тинькофф', status: 'COMPLETED' } })
  }

  // ─── Комплаенс-алерты (8) ───
  const alerts = [
    { type: 'STRUCTURING', severity: 'HIGH', riskScore: 0.87, description: 'Серия из 5 выводов по 95 000 ₽ за 18 минут — признаки структурирования (115-ФЗ ст.6).', entityType: 'withdrawal', ruleId: 'R-STRUCT-001', status: 'OPEN' },
    { type: 'VELOCITY', severity: 'MEDIUM', riskScore: 0.64, description: 'Вход на 4 новых устройства за 12 минут из разных гео (RU → KZ → AE).', entityType: 'user', ruleId: 'R-VEL-002', status: 'OPEN' },
    { type: 'SANCTION', severity: 'CRITICAL', riskScore: 0.96, description: 'Совпадение бенефициара со списком Росфинмониторинга (match score 0.96).', entityType: 'transaction', ruleId: 'R-SANC-001', status: 'OPEN' },
    { type: 'THRESHOLD', severity: 'LOW', riskScore: 0.28, description: 'Разовая транзакция 1 250 000 ₽ — превышение порога мониторинга.', entityType: 'transaction', ruleId: 'R-THR-001', status: 'REVIEWING' },
    { type: 'PATTERN', severity: 'MEDIUM', riskScore: 0.58, description: 'Нетипичная активность: вывод на новый адрес в нерабочее время.', entityType: 'withdrawal', ruleId: 'R-PAT-003', status: 'OPEN' },
    { type: 'STRUCTURING', severity: 'HIGH', riskScore: 0.78, description: '10 транзакций по 98 000 ₽ через разные коридоры за 2 часа.', entityType: 'transaction', ruleId: 'R-STRUCT-002', status: 'OPEN' },
    { type: 'VELOCITY', severity: 'LOW', riskScore: 0.34, description: '3 смены IP за 5 минут (один город).', entityType: 'user', ruleId: 'R-VEL-003', status: 'APPROVED' },
    { type: 'SANCTION', severity: 'HIGH', riskScore: 0.82, description: 'Fuzzy match по банку-получателю с санкционным списком EU.', entityType: 'transaction', ruleId: 'R-SANC-002', status: 'OPEN' },
  ]
  for (const a of alerts) {
    await db.complianceAlert.create({ data: a })
  }
  console.log(`  ✓ ${alerts.length} комплаенс-алертов`)

  // ─── Кросс-бордер платежи ───
  await db.crossBorderPayment.create({ data: { userId: demoUser.id, corridor: 'RU-CN', fromCurrency: 'RUB', toCurrency: 'CNY', amount: 500000, receiveAmount: 41050, fee: 4000, rate: 0.083, beneficiary: 'Shenzhen Tech Co., Ltd.', purpose: 'Оплата оборудования по контракту №2026-0142', status: 'SETTLED' } })
  await db.crossBorderPayment.create({ data: { userId: demoUser.id, corridor: 'RU-AE', fromCurrency: 'RUB', toCurrency: 'AED', amount: 800000, receiveAmount: 31680, fee: 9600, rate: 0.04, beneficiary: 'Al Manara Trading FZE', purpose: 'Консультационные услуги', status: 'CONVERTING' } })
  await db.crossBorderPayment.create({ data: { userId: demoUser.id, corridor: 'RU-TR', fromCurrency: 'RUB', toCurrency: 'TRY', amount: 350000, receiveAmount: 118480, fee: 3150, rate: 0.34, beneficiary: 'Istanbul Logistics A.S.', purpose: 'Транспортные услуги', status: 'INITIATED' } })
  console.log(`  ✓ 3 кросс-бордер платежа`)

  // ─── Login events для demo user ───
  const loginEvents = [
    { ip: '95.108.213.45', device: 'Chrome on Windows', browser: 'Chrome 131', location: 'Москва, РФ', success: true, daysAgo: 0 },
    { ip: '95.108.213.45', device: 'Chrome on Windows', browser: 'Chrome 131', location: 'Москва, РФ', success: true, daysAgo: 1 },
    { ip: '178.176.72.18', device: 'Safari on iPhone', browser: 'Safari 17', location: 'Санкт-Петербург, РФ', success: true, daysAgo: 2 },
    { ip: '45.146.232.41', device: 'Unknown', browser: 'Unknown', location: 'Unknown', success: false, daysAgo: 3 },
    { ip: '91.108.213.45', device: 'Firefox on Linux', browser: 'Firefox 128', location: 'Москва, РФ', success: true, daysAgo: 4 },
    { ip: '45.146.232.41', device: 'Unknown', browser: 'Unknown', location: 'Unknown', success: false, daysAgo: 5 },
    { ip: '188.162.72.18', device: 'Chrome on Android', browser: 'Chrome 130', location: 'Казань, РФ', success: true, daysAgo: 6 },
    { ip: '95.108.213.45', device: 'Chrome on Windows', browser: 'Chrome 130', location: 'Москва, РФ', success: true, daysAgo: 7 },
  ]
  for (const e of loginEvents) {
    await db.loginEvent.create({
      data: {
        userId: demoUser.id,
        ip: e.ip,
        device: e.device,
        browser: e.browser,
        location: e.location,
        success: e.success,
        createdAt: new Date(Date.now() - e.daysAgo * 86400000),
      },
    })
  }
  console.log(`  ✓ ${loginEvents.length} login events`)

  // ─── Рефералы ───
  const referrals = [
    { referredEmail: 'friend1@mail.ru', reward: 1200, status: 'REWARDED' },
    { referredEmail: 'colleague@work.ru', reward: 800, status: 'VERIFIED' },
    { referredEmail: 'family@home.ru', reward: 500, status: 'REGISTERED' },
  ]
  for (const r of referrals) {
    await db.referral.create({ data: { code: demoUser.referralCode || 'RU-USER01', referrerId: demoUser.id, referredEmail: r.referredEmail, reward: r.reward, status: r.status } })
  }
  console.log(`  ✓ ${referrals.length} реферала`)

  console.log('\n✅ Расширенный seed завершён!')
  console.log('   ─── ДЕМО-УЧЁТКИ ───')
  console.log('   👤 Пользователь:  user@ruscrypto.ru  (роль USER, видит торги/кошелёк/комплаенс)')
  console.log('   🛡️ Админ:         admin@ruscrypto.ru  (роль ADMIN, видит + Админка в меню)')
  console.log('   ⚖️ Комплаенс:     compliance@ruscrypto.ru (роль COMPLIANCE, видит + Админка)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
