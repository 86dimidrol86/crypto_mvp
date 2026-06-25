import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding РусКрипто demo database...')

  // Демо-пользователь
  const user = await db.user.upsert({
    where: { email: 'ivan.ivanov@gosuslugi.ru' },
    update: {},
    create: {
      email: 'ivan.ivanov@gosuslugi.ru',
      name: 'Иван Иванов',
      phone: '+7 (999) 123-45-67',
      kycLevel: 2,
      kycStatus: 'ACTIVE',
      qualified: false,
      role: 'USER',
    },
  })

  // Устанавливаем реферальный код (RU- + первые 6 символов id)
  const referralCode = `RU-${user.id.slice(0, 6).toUpperCase()}`
  await db.user.update({
    where: { id: user.id },
    data: { referralCode },
  })
  console.log(`  ✓ User: ${user.email} (KYC Lv.${user.kycLevel}) referralCode=${referralCode}`)

  // Compliance officer
  const officer = await db.user.upsert({
    where: { email: 'compliance@ruscrypto.ru' },
    update: {},
    create: {
      email: 'compliance@ruscrypto.ru',
      name: 'Анна Петрова',
      role: 'COMPLIANCE',
      kycLevel: 2,
      kycStatus: 'ACTIVE',
    },
  })

  // Балансы
  const balances = [
    { asset: 'RUB', amount: 1245800 },
    { asset: 'USDT', amount: 2450.75 },
    { asset: 'BTC', amount: 0.1245 },
    { asset: 'ETH', amount: 3.45 },
  ]
  for (const b of balances) {
    await db.balance.upsert({
      where: { userId_asset: { userId: user.id, asset: b.asset } },
      update: { amount: b.amount },
      create: { ...b, userId: user.id },
    })
  }
  console.log(`  ✓ ${balances.length} balances created`)

  // Транзакции
  const txTypes = [
    { type: 'deposit', asset: 'USDT', amount: 500, status: 'COMPLETED', address: 'TNX9...k4p', txHash: '0xa1b2...c3d4' },
    { type: 'withdrawal', asset: 'RUB', amount: -25000, status: 'COMPLETED' },
    { type: 'trade', asset: 'BTC', amount: -0.0125, status: 'COMPLETED' },
    { type: 'deposit', asset: 'ETH', amount: 1.2, status: 'COMPLETED', address: '0x742d...L71', txHash: '0x9f8e...d7c6' },
    { type: 'withdrawal', asset: 'USDT', amount: -300, status: 'PENDING', address: 'TRX2...m9z' },
  ]
  for (const t of txTypes) {
    await db.transaction.create({ data: { ...t, userId: user.id } })
  }
  console.log(`  ✓ ${txTypes.length} transactions created`)

  // Сделки (с реальными ордерами для FK)
  const trades = [
    { pair: 'BTC/RUB', side: 'buy', type: 'limit', price: 4620000, quantity: 0.0125, total: 57750, fee: 115.5 },
    { pair: 'ETH/RUB', side: 'buy', type: 'limit', price: 122000, quantity: 1.2, total: 146400, fee: 292.8 },
    { pair: 'BTC/RUB', side: 'sell', type: 'limit', price: 4710000, quantity: 0.0125, total: 58875, fee: 117.75 },
    { pair: 'USDT/RUB', side: 'buy', type: 'market', price: 93.5, quantity: 500, total: 46750, fee: 93.5 },
  ]
  for (const t of trades) {
    const order = await db.order.create({
      data: {
        userId: user.id,
        pair: t.pair,
        side: t.side,
        type: t.type,
        price: t.price,
        quantity: t.quantity,
        filledQty: t.quantity,
        status: 'FILLED',
      },
    })
    await db.trade.create({
      data: {
        orderId: order.id,
        userId: user.id,
        pair: t.pair,
        side: t.side,
        price: t.price,
        quantity: t.quantity,
        total: t.total,
        fee: t.fee,
      },
    })
  }
  console.log(`  ✓ ${trades.length} orders + trades created`)

  // P2P офферы
  const users = ['CryptoKing', 'RubTrader', 'FastP2P', 'SberExchange', 'TinkoffPro', 'QuickSwap']
  const methods = ['СБП', 'Тинькофф', 'Сбер', 'СБП + Тинькофф']
  for (let i = 0; i < 18; i++) {
    const type = Math.random() > 0.5 ? 'buy' : 'sell'
    const price = parseFloat((92 + Math.random() * 2.5).toFixed(2))
    const amount = Math.floor(Math.random() * 8000) + 200
    await db.p2POffer.create({
      data: {
        userId: user.id,
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
  console.log(`  ✓ 18 P2P offers created`)

  // P2P сделки (берём первый реальный оффер)
  const firstOffer = await db.p2POffer.findFirst({ where: { userId: user.id } })
  if (firstOffer) {
    await db.p2PDeal.create({
      data: {
        offerId: firstOffer.id,
        buyerId: user.id,
        asset: 'USDT',
        amount: 500,
        price: 93.7,
        total: 46850,
        paymentMethod: 'СБП',
        status: 'PENDING',
      },
    })
    await db.p2PDeal.create({
      data: {
        offerId: firstOffer.id,
        buyerId: user.id,
        asset: 'USDT',
        amount: 300,
        price: 94.2,
        total: 28260,
        paymentMethod: 'Тинькофф',
        status: 'COMPLETED',
      },
    })
  }

  // Комплаенс-алерты
  const alerts = [
    {
      type: 'STRUCTURING',
      severity: 'HIGH',
      riskScore: 0.87,
      description: 'Серия из 5 выводов по 95 000 ₽ за 18 минут — признаки структурирования (115-ФЗ ст.6).',
      entityType: 'withdrawal',
      ruleId: 'R-STRUCT-001',
      status: 'OPEN',
    },
    {
      type: 'VELOCITY',
      severity: 'MEDIUM',
      riskScore: 0.64,
      description: 'Вход на 4 новых устройства за 12 минут из разных гео (RU → KZ → AE).',
      entityType: 'user',
      ruleId: 'R-VEL-002',
      status: 'OPEN',
    },
    {
      type: 'SANCTION',
      severity: 'CRITICAL',
      riskScore: 0.96,
      description: 'Совпадение бенефициара со списком Росфинмониторинга (match score 0.96).',
      entityType: 'transaction',
      ruleId: 'R-SANC-001',
      status: 'OPEN',
    },
    {
      type: 'THRESHOLD',
      severity: 'LOW',
      riskScore: 0.28,
      description: 'Разовая транзакция 1 250 000 ₽ — превышение порога мониторинга.',
      entityType: 'transaction',
      ruleId: 'R-THR-001',
      status: 'REVIEWING',
    },
    {
      type: 'PATTERN',
      severity: 'MEDIUM',
      riskScore: 0.58,
      description: 'Нетипичная активность: вывод на новый адрес в нерабочее время.',
      entityType: 'withdrawal',
      ruleId: 'R-PAT-003',
      status: 'OPEN',
    },
  ]
  for (const a of alerts) {
    await db.complianceAlert.create({ data: a })
  }
  console.log(`  ✓ ${alerts.length} compliance alerts created`)

  // Кросс-бордер платежи
  await db.crossBorderPayment.create({
    data: {
      userId: user.id,
      corridor: 'RU-CN',
      fromCurrency: 'RUB',
      toCurrency: 'CNY',
      amount: 500000,
      receiveAmount: 41050,
      fee: 4000,
      rate: 0.083,
      beneficiary: 'Shenzhen Tech Co., Ltd.',
      purpose: 'Оплата оборудования по контракту №2026-0142',
      status: 'CONVERTING',
    },
  })
  await db.crossBorderPayment.create({
    data: {
      userId: user.id,
      corridor: 'RU-AE',
      fromCurrency: 'RUB',
      toCurrency: 'AED',
      amount: 800000,
      receiveAmount: 31680,
      fee: 9600,
      rate: 0.04,
      beneficiary: 'Al Manara Trading FZE',
      purpose: 'Консультационные услуги',
      status: 'SETTLED',
    },
  })
  console.log(`  ✓ 2 cross-border payments created`)

  // События входа (LoginEvent) — реалистичная активность за последние 7 дней
  const now = Date.now()
  const minutesAgo = (m: number) => new Date(now - m * 60 * 1000)
  const loginEvents = [
    { ip: '85.140.12.84', device: 'iPhone 15 Pro', browser: 'Safari Mobile', location: 'Москва, РФ', success: true, createdAt: minutesAgo(35) },
    { ip: '85.140.12.84', device: 'Windows 11', browser: 'Chrome 121', location: 'Москва, РФ', success: true, createdAt: minutesAgo(180) },
    { ip: '178.66.24.12', device: 'Android 14', browser: 'РусКрипто App', location: 'Санкт-Петербург, РФ', success: true, createdAt: minutesAgo(1500) },
    { ip: '95.153.132.8', device: 'macOS Sonoma', browser: 'Firefox 122', location: 'Казань, РФ', success: true, createdAt: minutesAgo(2880) },
    { ip: '203.0.113.42', device: 'Unknown', browser: 'Unknown', location: 'Неизвестно', success: false, createdAt: minutesAgo(4200) },
    { ip: '198.51.100.7', device: 'Unknown', browser: 'curl/8.5', location: 'Неизвестно', success: false, createdAt: minutesAgo(4320) },
    { ip: '85.140.12.84', device: 'iPhone 15 Pro', browser: 'Safari Mobile', location: 'Москва, РФ', success: true, createdAt: minutesAgo(5760) },
    { ip: '85.140.12.84', device: 'Windows 11', browser: 'Edge 121', location: 'Москва, РФ', success: true, createdAt: minutesAgo(8640) },
  ]
  for (const e of loginEvents) {
    await db.loginEvent.create({ data: { ...e, userId: user.id } })
  }
  console.log(`  ✓ ${loginEvents.length} login events created`)

  // Рефералы
  const referrals = [
    { code: referralCode, referrerId: user.id, referredEmail: 'alex.smirnov@gmail.com', reward: 1200, status: 'REWARDED', createdAt: minutesAgo(7200) },
    { code: referralCode, referrerId: user.id, referredEmail: 'maria.kozlova@yandex.ru', reward: 800, status: 'REWARDED', createdAt: minutesAgo(5400) },
    { code: referralCode, referrerId: user.id, referredEmail: 'dmitry.volkov@mail.ru', reward: 500, status: 'VERIFIED', createdAt: minutesAgo(2160) },
  ]
  for (const r of referrals) {
    await db.referral.create({ data: r })
  }
  console.log(`  ✓ ${referrals.length} referrals created (total reward ${referrals.reduce((s, r) => s + r.reward, 0)} ₽)`)

  console.log('\n✅ Seed complete!')
  console.log(`   Demo user: ${user.email}`)
  console.log(`   Officer: ${officer.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
