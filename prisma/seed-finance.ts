// Seed финансовых данных: банки, комиссии, лимиты, счета, транзакции
import { db } from '../src/lib/db'

const BANKS = [
  {
    name: 'ВТБ',
    bic: '044525201',
    swift: 'VTBRRUMM',
    inn: '7702070139',
    correspondentAccount: '30101810345250000411',
    type: 'FIAT_DEPOSIT',
    status: 'ACTIVE',
    priority: 1,
    contactPerson: 'Иванов И.В.',
    contactPhone: '+7 (495) 777-24-24',
    contactEmail: 'fintech@vtb.ru',
    // Регуляторные
    licenseStatus: 'ACTIVE',
    capitalRequirement: 100000000,
    dataProcessorAgreement: 'ДП-2026-001 от 15.01.2026',
    // Технические (ВТБ требует ГОСТ + SOAP)
    apiEndpoint: 'https://api.vtb.ru/ibk/v1',
    apiProtocol: 'SOAP',
    cryptoProtocol: 'GOST_TLS_1_3',
    oauthServerUrl: 'https://oauth.vtb.ru/token',
    oauthClientId: 'vtb_ruscrypto_client',
    signingCertificate: 'CryptoPro ВТБ 2026',
    paymentPageMode: 'API',
    isSandbox: true,
    webhookUrl: 'https://ruscrypto.ru/api/finance/webhooks/vtb',
    webhookSecret: 'wh_secret_vtb_2026',
  },
  {
    name: 'Альфа-Банк',
    bic: '044525593',
    swift: 'ALFARUMM',
    inn: '7728168971',
    correspondentAccount: '30101810200000000593',
    type: 'SBP',
    status: 'ACTIVE',
    priority: 1,
    contactPerson: 'Петрова А.С.',
    contactPhone: '+7 (495) 788-88-78',
    contactEmail: 'api@alfabank.ru',
    licenseStatus: 'ACTIVE',
    capitalRequirement: 100000000,
    dataProcessorAgreement: 'ДП-2026-002 от 20.01.2026',
    apiEndpoint: 'https://alfa.rbslnk.ru/v1',
    apiProtocol: 'REST',
    cryptoProtocol: 'STANDARD_TLS',
    oauthServerUrl: 'https://oauth.alfabank.ru/token',
    oauthClientId: 'alfa_ruscrypto',
    merchantLogin: 'ruscrypto_merchant',
    paymentPageMode: 'HOSTED',
    isSandbox: true,
    webhookUrl: 'https://ruscrypto.ru/api/finance/webhooks/alfa',
    webhookSecret: 'wh_secret_alfa_2026',
  },
  {
    name: 'Сбербанк',
    bic: '044525225',
    swift: 'SABRRUMM',
    inn: '7707083893',
    correspondentAccount: '30101810400000000225',
    type: 'FIAT_WITHDRAW',
    status: 'ACTIVE',
    priority: 2,
    contactPerson: 'Смирнов В.К.',
    contactPhone: '+7 (495) 500-55-50',
    contactEmail: 'b2b@sberbank.ru',
    licenseStatus: 'ACTIVE',
    capitalRequirement: 100000000,
    dataProcessorAgreement: 'ДП-2026-003 от 25.01.2026',
    apiEndpoint: 'https://api.sberbank.ru/v1',
    apiProtocol: 'REST',
    cryptoProtocol: 'GOST_TLS_1_3',
    oauthServerUrl: 'https://api.sberbank.ru/ru/prod/tokens/v2/oauth',
    oauthClientId: 'sber_ruscrypto',
    paymentPageMode: 'API',
    isSandbox: true,
    webhookUrl: 'https://ruscrypto.ru/api/finance/webhooks/sber',
    webhookSecret: 'wh_secret_sber_2026',
  },
  {
    name: 'Газпромбанк',
    bic: '044525623',
    swift: 'GAZPRUMM',
    inn: '7744001497',
    correspondentAccount: '30101810200000000623',
    type: 'CROSS_BORDER',
    status: 'ACTIVE',
    priority: 1,
    contactPerson: 'Козлов Д.А.',
    contactPhone: '+7 (495) 413-90-90',
    contactEmail: 'fintech@gazprombank.ru',
    licenseStatus: 'ACTIVE',
    capitalRequirement: 100000000,
    dataProcessorAgreement: 'ДП-2026-004 от 01.02.2026',
    apiEndpoint: 'https://api.gpb.ru/v1',
    apiProtocol: 'SOAP',
    cryptoProtocol: 'GOST_TLS_1_3',
    oauthServerUrl: 'https://oauth.gpb.ru/token',
    oauthClientId: 'gpb_ruscrypto',
    signingCertificate: 'CryptoPro ГПБ 2026',
    paymentPageMode: 'API',
    isSandbox: true,
    webhookUrl: 'https://ruscrypto.ru/api/finance/webhooks/gpb',
    webhookSecret: 'wh_secret_gpb_2026',
  },
  {
    name: 'Тинькофф',
    bic: '045004774',
    swift: 'TICSRUMM',
    inn: '7710140679',
    correspondentAccount: '30101810145250000974',
    type: 'SBP',
    status: 'ACTIVE',
    priority: 2,
    contactPerson: 'Волкова Е.М.',
    contactPhone: '+7 (495) 645-59-09',
    contactEmail: 'b2b@tinkoff.ru',
    licenseStatus: 'ACTIVE',
    capitalRequirement: 100000000,
    dataProcessorAgreement: 'ДП-2026-005 от 05.02.2026',
    apiEndpoint: 'https://securepay.tinkoff.ru/v2',
    apiProtocol: 'REST',
    cryptoProtocol: 'STANDARD_TLS',
    merchantLogin: 'ruscrypto_terminal',
    paymentPageMode: 'HOSTED',
    isSandbox: true,
    webhookUrl: 'https://ruscrypto.ru/api/finance/webhooks/tinkoff',
    webhookSecret: 'wh_secret_tinkoff_2026',
  },
]

const CORRIDORS = [
  { id: 'RU-CN', senderBank: 'Газпромбанк', receiverBank: 'Bank of China', bridge: 'Chainbridge', fee: 1.0, etaMin: 15, etaMax: 40 },
  { id: 'RU-AE', senderBank: 'ВТБ', receiverBank: 'Emirates NBD', bridge: 'FAB Bridge', fee: 1.2, etaMin: 60, etaMax: 180 },
  { id: 'RU-TR', senderBank: 'Сбербанк', receiverBank: 'Ziraat Bank', bridge: 'Turkbridge', fee: 0.9, etaMin: 30, etaMax: 60 },
  { id: 'RU-IN', senderBank: 'ВТБ', receiverBank: 'SBI India', bridge: 'IndoBridge', fee: 1.1, etaMin: 60, etaMax: 120 },
  { id: 'RU-KZ', senderBank: 'Сбербанк', receiverBank: 'Halyk Bank', bridge: 'KZBridge', fee: 0.6, etaMin: 10, etaMax: 30 },
  { id: 'RU-AM', senderBank: 'Газпромбанк', receiverBank: 'Ameriabank', bridge: 'ArmenBridge', fee: 0.7, etaMin: 15, etaMax: 45 },
]

async function main() {
  console.log('🏦 Seed финансового модуля РусКрипто...')

  // FINANCE demo user
  const financeUser = await db.user.upsert({
    where: { email: 'finance@ruscrypto.ru' },
    update: { name: 'Дмитрий Финансов', role: 'FINANCE', kycLevel: 2, kycStatus: 'ACTIVE' },
    create: {
      email: 'finance@ruscrypto.ru',
      name: 'Дмитрий Финансов',
      kycLevel: 2,
      kycStatus: 'ACTIVE',
      role: 'FINANCE',
      referralCode: 'RU-FIN01',
    },
  })
  console.log(`  ✓ FINANCE user: ${financeUser.email}`)

  // Banks
  for (const b of BANKS) {
    const bank = await db.bank.upsert({
      where: { bic: b.bic },
      update: {},
      create: {
        ...b,
        contractDate: new Date('2026-01-15'),
        contractExpiry: new Date('2027-01-15'),
      },
    })

    // BankFee (4 operation types)
    const fees = [
      { operationType: 'DEPOSIT', feeType: 'PERCENT', feePercent: 0.0, feeFixed: 0, payer: 'EXCHANGE' },
      { operationType: 'WITHDRAW', feeType: 'COMBINED', feePercent: 1.0, feeFixed: 50, feeMin: 50, payer: 'USER' },
      { operationType: 'CROSS_BORDER', feeType: 'PERCENT', feePercent: 1.5, feeFixed: 0, payer: 'USER' },
      { operationType: 'SBP_TRANSFER', feeType: 'PERCENT', feePercent: 0.5, feeFixed: 0, feeMin: 10, payer: 'USER' },
    ]
    for (const f of fees) {
      await db.bankFee.create({ data: { ...f, bankId: bank.id, currency: 'RUB' } })
    }

    // BankLimit
    await db.bankLimit.upsert({
      where: { bankId: bank.id },
      update: {},
      create: {
        bankId: bank.id,
        dailyLimit: 50000000,
        monthlyLimit: 500000000,
        perTransactionLimit: 1000000,
        perUserDailyLimit: 300000,
        alertThreshold: 0.8,
        autoSuspendOnLimit: true,
      },
    })

    // BankAccount (correspondent)
    await db.bankAccount.create({
      data: {
        bankId: bank.id,
        accountNumber: b.correspondentAccount || '40702810000000000000',
        currency: 'RUB',
        balance: Math.floor(5000000 + Math.random() * 45000000),
        minBalance: 1000000,
        type: 'CORRESPONDENT',
        lastSyncAt: new Date(),
      },
    })
  }
  console.log(`  ✓ ${BANKS.length} банков с комиссиями, лимитами, счетами`)

  // BankTransaction — 600+ транзакций за июнь-июль (2 месяца, ~10 в день)
  // Июнь: с 1 июня по 30 июня, Июль: с 1 июля по 31 июля
  const allBanks = await db.bank.findMany()
  const txTypes = ['DEPOSIT', 'WITHDRAW', 'CROSS_BORDER', 'SBP']
  const users = await db.user.findMany({ take: 10 })

  // Очистка старых транзакций (чтобы не дублировать при повторном seed)
  await db.bankTransaction.deleteMany({})
  console.log(`  ✓ Старые транзакции очищены`)

  // Генерация: июнь (30 дней) + июль (31 день) = 61 день × ~10 tx = ~610 транзакций
  const startDate = new Date('2026-06-01T00:00:00')
  const endDate = new Date('2026-07-31T23:59:59')
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)
  let txCount = 0

  for (let day = 0; day <= totalDays; day++) {
    const dayDate = new Date(startDate.getTime() + day * 86400000)
    // 8-15 транзакций в день (рандомно)
    const txPerDay = 8 + Math.floor(Math.random() * 8)
    for (let j = 0; j < txPerDay; j++) {
      const bank = allBanks[Math.floor(Math.random() * allBanks.length)]
      const type = txTypes[Math.floor(Math.random() * txTypes.length)]
      const amount = Math.floor(1000 + Math.random() * 4999000)
      const isThreshold = amount > 600000
      const r = Math.random()
      const status = r > 0.92 ? 'SUSPENDED_BY_BANK' : r > 0.88 ? 'PENDING' : r > 0.85 ? 'FAILED' : 'COMPLETED'
      // Случайное время в течение дня
      const hour = Math.floor(Math.random() * 24)
      const minute = Math.floor(Math.random() * 60)
      const createdAt = new Date(dayDate)
      createdAt.setHours(hour, minute, Math.floor(Math.random() * 60))
      await db.bankTransaction.create({
        data: {
          bankId: bank.id,
          userId: users[Math.floor(Math.random() * users.length)]?.id || null,
          type,
          amount,
          fee: amount * (0.005 + Math.random() * 0.01), // 0.5%-1.5% комиссия
          feePayer: Math.random() > 0.3 ? 'USER' : 'EXCHANGE',
          currency: 'RUB',
          status,
          bankReference: `BK${day}${j}${Date.now()}`,
          isThreshold,
          processedAt: status === 'COMPLETED' ? createdAt : null,
          createdAt,
        },
      })
      txCount++
    }
  }
  console.log(`  ✓ ${txCount} банковских транзакций за июнь-июль`)

  // Corridors
  for (const c of CORRIDORS) {
    const senderBank = await db.bank.findFirst({ where: { name: c.senderBank } })
    await db.corridorConfig.upsert({
      where: { corridorId: c.id },
      update: { senderBankId: senderBank?.id || null },
      create: {
        corridorId: c.id,
        senderBankId: senderBank?.id || null,
        receiverBankId: null,
        liquidityBridge: c.bridge,
        feePercent: c.fee,
        feeMin: 100,
        etaMin: c.etaMin,
        etaMax: c.etaMax,
        minAmount: 10000,
        maxAmount: 10000000,
        active: true,
      },
    })
  }
  console.log(`  ✓ ${CORRIDORS.length} коридоров`)

  // Reconciliation
  const vtb = await db.bank.findFirst({ where: { name: 'ВТБ' } })
  const alfa = await db.bank.findFirst({ where: { name: 'Альфа-Банк' } })
  if (vtb) {
    await db.bankReconciliation.create({
      data: {
        bankId: vtb.id,
        period: '2026-05',
        totalTransactions: 45,
        matchedCount: 45,
        unmatchedInternal: 0,
        unmatchedBank: 0,
        status: 'MATCHED',
      },
    })
  }
  if (alfa) {
    await db.bankReconciliation.create({
      data: {
        bankId: alfa.id,
        period: '2026-05',
        totalTransactions: 38,
        matchedCount: 36,
        unmatchedInternal: 2,
        unmatchedBank: 0,
        status: 'DISCREPANCY',
        discrepancyAmount: 150000,
      },
    })
  }
  console.log(`  ✓ 2 сверки (1 MATCHED, 1 DISCREPANCY)`)

  // Webhook logs
  if (vtb) {
    for (let i = 0; i < 3; i++) {
      await db.bankWebhookLog.create({
        data: {
          bankId: vtb.id,
          eventType: 'PAYMENT_STATUS_CHANGED',
          payload: JSON.stringify({ reference: `BK${i}`, status: 'COMPLETED', amount: 500000 }),
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      })
    }
  }
  if (alfa) {
    await db.bankWebhookLog.create({
      data: {
        bankId: alfa.id,
        eventType: 'SUSPENDED',
        payload: JSON.stringify({ reference: 'ALFA003', reason: 'Compliance review', amount: 750000 }),
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    })
    await db.bankWebhookLog.create({
      data: {
        bankId: alfa.id,
        eventType: 'REFUND',
        payload: JSON.stringify({ reference: 'ALFA004', amount: 25000 }),
        status: 'RECEIVED',
      },
    })
  }
  console.log(`  ✓ 5 webhook логов`)

  console.log('\n✅ Финансовый seed завершён!')
  console.log('   💼 FINANCE аккаунт: finance@ruscrypto.ru (роль FINANCE)')
  console.log(`   🏦 Банков: ${BANKS.length} (ВТБ, Альфа, Сбер, ГПБ, Тинькофф)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
