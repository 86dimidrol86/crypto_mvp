import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/banks — список банков с комиссиями, лимитами, счетами
export async function GET() {
  try {
    const banks = await db.bank.findMany({
      include: {
        fees: { where: { active: true } },
        limits: true,
        accounts: true,
      },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ banks })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch banks' }, { status: 500 })
  }
}

// POST /api/finance/banks — создать банк
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const bank = await db.bank.create({
      data: {
        name: body.name,
        bic: body.bic,
        swift: body.swift || null,
        inn: body.inn || null,
        correspondentAccount: body.correspondentAccount || null,
        type: body.type || 'FIAT_DEPOSIT',
        status: body.status || 'ACTIVE',
        priority: body.priority || 3,
        contactPerson: body.contactPerson || null,
        contactPhone: body.contactPhone || null,
        contactEmail: body.contactEmail || null,
        licenseStatus: body.licenseStatus || null,
        capitalRequirement: body.capitalRequirement || null,
        dataProcessorAgreement: body.dataProcessorAgreement || null,
        apiEndpoint: body.apiEndpoint || null,
        apiProtocol: body.apiProtocol || 'REST',
        cryptoProtocol: body.cryptoProtocol || 'STANDARD_TLS',
        oauthServerUrl: body.oauthServerUrl || null,
        oauthClientId: body.oauthClientId || null,
        oauthClientSecret: body.oauthClientSecret || null,
        merchantLogin: body.merchantLogin || null,
        merchantPassword: body.merchantPassword || null,
        signingCertificate: body.signingCertificate || null,
        paymentPageMode: body.paymentPageMode || 'API',
        isSandbox: body.isSandbox ?? true,
        webhookUrl: body.webhookUrl || null,
        webhookSecret: body.webhookSecret || null,
        contractDate: body.contractDate ? new Date(body.contractDate) : null,
        contractExpiry: body.contractExpiry ? new Date(body.contractExpiry) : null,
      },
    })
    return NextResponse.json({ bank })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create bank' }, { status: 500 })
  }
}
