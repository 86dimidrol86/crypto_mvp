#!/usr/bin/env node
// Генератор HTML презентации РусКрипто (5 слайдов, 1920×1080 Full HD)
import { writeFileSync, mkdirSync } from 'fs'
const OUTPUT_DIR = 'download'

// ─── Lucide SVG-иконки (как в оригинальной React-версии) ─────────────────────
const svgAttrs = 'width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
const ICONS = {
  trendingUp: `<svg ${svgAttrs}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  building2: `<svg ${svgAttrs}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
  scale: `<svg ${svgAttrs}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`,
}

const slidesData = [
  { id: 'title', html: `
      <div class="slide slide-title">
        <div class="logo-big">₿</div>
        <h1>РусКрипто</h1>
        <p class="subtitle">Легальная криптобиржа Российской Федерации</p>
        <p class="laws">ФЗ № 259-ФЗ «О ЦФА» • ФЗ № 1194918-8 «О цифровой валюте» • ФЗ № 115 «О ПОД/ФТ» • Платформа цифрового рубля ЦБ РФ</p>
        <div class="badge">● MVP v2.0 • Июль 2026</div>
      </div>` },
  { id: 'scheme', html: `
      <div class="slide">
        <div class="slide-header"><div class="header-icon">${ICONS.trendingUp}</div><h2>Трафик денег и комиссии</h2></div>
        <div class="card flow-card">
          <div class="flow-section">
            <div class="flow-label flow-in">▼ ВВОД СРЕДСТВ (₽ → Биржа)</div>
            <div class="flow-row">
              <div class="node node-user"><div class="node-icon">👤</div><div class="node-label">Пользователь</div><div class="node-sub">Личный счёт ₽</div></div>
              <div class="arrow arrow-success"><span class="arrow-label">1. Перевод ₽</span><span class="arrow-line"></span><span class="arrow-fee">банк: 0.5-2%</span></div>
              <div class="node node-bank"><div class="node-icon">🏦</div><div class="node-label">Банк</div><div class="node-sub">Спецсчёт биржи</div></div>
              <div class="arrow arrow-primary"><span class="arrow-label">2. ₽ → Цифровой ₽</span><span class="arrow-line"></span><span class="arrow-fee">ФЗ-259 • ЦБ РФ</span></div>
              <div class="node node-exchange"><div class="node-icon">🏛️</div><div class="node-label">Биржа</div><div class="node-sub">Баланс игрока</div></div>
              <div class="arrow arrow-primary"><span class="arrow-label">3. Торговля</span><span class="arrow-line"></span><span class="arrow-fee">биржа: 0.1-0.5%</span></div>
              <div class="node node-crypto"><div class="node-icon">💎</div><div class="node-label">Криптовалюта</div><div class="node-sub">BTC, ETH, USDT</div></div>
            </div>
            <div class="flow-label flow-out">▲ ВЫВОД СРЕДСТВ (Крипта → ₽)</div>
            <div class="flow-row">
              <div class="node node-crypto"><div class="node-icon">💎</div><div class="node-label">Продажа</div><div class="node-sub">Крипта → ₽</div></div>
              <div class="arrow arrow-danger"><span class="arrow-label">4. Списание</span><span class="arrow-line"></span><span class="arrow-fee">биржа: 0.5%</span></div>
              <div class="node node-exchange"><div class="node-icon">🏛️</div><div class="node-label">Биржа</div><div class="node-sub">Конвертация</div></div>
              <div class="arrow arrow-danger"><span class="arrow-label">5. Цифровой ₽ → ₽</span><span class="arrow-line"></span><span class="arrow-fee">банк: 0.1-0.5%</span></div>
              <div class="node node-bank"><div class="node-icon">🏦</div><div class="node-label">Банк</div><div class="node-sub">Спецсчёт → ₽</div></div>
              <div class="arrow arrow-danger"><span class="arrow-label">6. Перевод ₽</span><span class="arrow-line"></span><span class="arrow-fee">банк: 0.5-2%</span></div>
              <div class="node node-user"><div class="node-icon">👤</div><div class="node-label">Пользователь</div><div class="node-sub">Личный счёт ₽</div></div>
            </div>
          </div>
          <div class="roles-grid">
            <div class="role-card role-admin"><div class="role-header"><span class="role-icon">⚙️</span><b>Админ биржи</b></div><ul><li>▸ Управление банками</li><li>▸ Комиссии и лимиты</li><li>▸ Отключение модулей</li><li>▸ Мониторинг системы</li></ul></div>
            <div class="role-card role-compliance"><div class="role-header"><span class="role-icon">⚖️</span><b>Комплаенс</b></div><ul><li>▸ AML-алерты</li><li>▸ SAR-отчёты</li><li>▸ Карантин счетов</li><li>▸ Пороговые >600K ₽</li></ul></div>
            <div class="role-card role-finance"><div class="role-header"><span class="role-icon">💼</span><b>Финансист биржи</b></div><ul><li>▸ Обороты по банкам</li><li>▸ Сверка выписок</li><li>▸ Коридоры</li><li>▸ Отчёты для ЦБ</li></ul></div>
            <div class="role-card role-bank"><div class="role-header"><span class="role-icon">🏦</span><b>Сотрудник банка</b></div><ul><li>▸ Транзакции банка</li><li>▸ Настройки (просмотр)</li><li>▸ Сверка со своей стороны</li><li>▸ Отчёты по банку</li></ul></div>
          </div>
          <div class="aml-bar">⚖️ <b>AML-контроль (115-ФЗ)</b> на каждом этапе: банк → биржа → ЦБ РФ → Росфинмониторинг</div>
          <div class="bank-output"><div class="bank-output-icon">🏦</div><div class="bank-output-text"><b>Выходные данные для банка (Портал банка)</b><br>Биржа → банк: сводка всех транзакций • суммы • комиссии • статусы • сверка • пороговые операции • отчёты для ЦБ РФ</div><div class="bank-output-arrow">→</div></div>
          <div class="fees-grid">
            <div class="fee-card fee-bank"><div class="fee-value">0.5-2%</div><div class="fee-label">Банк<br>за перевод ₽</div></div>
            <div class="fee-card fee-exchange"><div class="fee-value">0.1-0.5%</div><div class="fee-label">Биржа<br>за торговлю</div></div>
            <div class="fee-card fee-output"><div class="fee-value">0.5-2%</div><div class="fee-label">Банк<br>за вывод ₽</div></div>
          </div>
        </div>
        <p class="flow-summary">▼ Ввод: Пользователь → Банк (спецсчёт) → ЦБ РФ (₽→ЦР) → Биржа → Торговля → Криптовалюта &nbsp;|&nbsp; ▲ Вывод: Крипта → Биржа → ЦБ РФ (ЦР→₽) → Банк → Пользователь</p>
      </div>` },
  { id: 'revenue', html: `
      <div class="slide">
        <div class="slide-header"><div class="header-icon">${ICONS.building2}</div><h2>Заработок банка</h2></div>
        <div class="revenue-grid">
          <div class="card revenue-card">
            <div class="revenue-header revenue-in">⬇️ Ввод средств (₽ → Биржа)</div>
            <div class="revenue-step"><span class="step-num">1</span><div class="step-info"><b>Перевод ₽ на спецсчёт</b><br><small>Пользователь → спецсчёт биржи в банке</small></div><div class="step-fee">0.5-2%<small>Банк</small></div></div>
            <div class="revenue-step"><span class="step-num">2</span><div class="step-info"><b>Конвертация ₽ → Цифровой ₽</b><br><small>Банк → платформа цифрового рубля ЦБ РФ (ФЗ-259)</small></div><div class="step-fee">0.1-0.5%<small>Банк + ЦБ</small></div></div>
            <div class="revenue-step"><span class="step-num">3</span><div class="step-info"><b>Зачисление на биржу</b><br><small>Цифровой ₽ → баланс пользователя на бирже</small></div><div class="step-fee">—<small>Биржа</small></div></div>
            <div class="revenue-total">Итого банк зарабатывает на вводе: <b>0.6-2.4%</b></div>
          </div>
          <div class="card revenue-card">
            <div class="revenue-header revenue-out">⬆️ Вывод средств (Биржа → ₽)</div>
            <div class="revenue-step"><span class="step-num">1</span><div class="step-info"><b>Списание с биржи</b><br><small>Баланс пользователя → конвертация в ₽</small></div><div class="step-fee">0.5%<small>Биржа</small></div></div>
            <div class="revenue-step"><span class="step-num">2</span><div class="step-info"><b>Конвертация Цифровой ₽ → ₽</b><br><small>ЦБ РФ → банк (ФЗ-259, ФЗ-1194918-8)</small></div><div class="step-fee">0.1-0.5%<small>Банк + ЦБ</small></div></div>
            <div class="revenue-step"><span class="step-num">3</span><div class="step-info"><b>Перевод ₽ пользователю</b><br><small>Спецсчёт → личный счёт пользователя</small></div><div class="step-fee">0.5-2%<small>Банк</small></div></div>
            <div class="revenue-total">Итого банк зарабатывает на выводе: <b>0.6-2.4%</b></div>
          </div>
        </div>
        <div class="card trading-bar"><span>⚡ Каждая торговая сделка на бирже:</span> <span>Биржа: <b>0.1-0.5%</b></span> <span>Банк (эквайринг): <b>0.05-0.3%</b></span></div>
      </div>` },
  { id: 'legal', html: `
      <div class="slide">
        <div class="slide-header"><div class="header-icon">${ICONS.scale}</div><h2>Регуляторная база</h2></div>
        <div class="legal-grid">
          <div class="card legal-card"><span class="legal-badge">ФЗ № 259-ФЗ</span><b>О цифровых финансовых активах</b><p>Правовая основа для ЦФА и цифрового рубля. Операторы ЦФА-платформ лицензируются ЦБ РФ.</p><ul><li>✅ Цифровой рубль — законное средство</li><li>✅ Платформа ЦБ РФ для конвертации</li><li>✅ Оператор ЦФА — лицензия ЦБ</li></ul></div>
          <div class="card legal-card"><span class="legal-badge">ФЗ № 1194918-8</span><b>О цифровой валюте</b><p>Легализация криптобирж с 01.07.2026. 5 типов лицензий. Уставный капитал от 100 млн ₽.</p><ul><li>✅ Лицензия оператора обмена</li><li>✅ Адрес-идентификаторы</li><li>✅ Квалификация инвесторов</li><li>✅ Капитал ≥ 100 млн ₽</li></ul></div>
          <div class="card legal-card"><span class="legal-badge">ФЗ № 115-ФЗ</span><b>ПОД/ФТ (AML)</b><p>Противодействие отмыванию. Идентификация, мониторинг, отчётность.</p><ul><li>✅ AML-консоль: 5 типов алертов</li><li>✅ SHAP-объяснимость ML</li><li>✅ SAR в Росфинмониторинг</li><li>✅ Порог >600K ₽ — авто-контроль</li></ul></div>
          <div class="card legal-card"><span class="legal-badge">ЦБ РФ</span><b>Платформа цифрового рубля</b><p>С 01.09.2026 — массовое внедрение. Банки-операторы конвертируют ₽ ↔ ЦР.</p><ul><li>✅ Спецсчёт биржи в банке</li><li>✅ Конвертация ₽ → цифровой ₽</li><li>✅ ЦБ РФ — оператор платформы</li><li>✅ Банк — оператор кошельков</li></ul></div>
        </div>
        <div class="card legal-note">✨ Банк выступает <b>оператором кошельков цифрового рубля</b> и <b>партнёром биржи</b> — зарабатывает на каждом переводе ₽ ↔ цифровой ₽ и комиссии за эквайринг</div>
      </div>` },
  { id: 'cta', html: `
      <div class="slide slide-cta">
        <div class="cta-icon">${ICONS.building2}</div>
        <h2>Выгодное партнёрство</h2>
        <p class="cta-desc">Банк-партнёр зарабатывает на каждом рубле, проходящем через биржу: ввод, вывод, конвертация в цифровой рубль, торговые сделки.</p>
        <div class="cta-stats">
          <div class="card cta-stat"><b>1.2-4.8%</b><small>с каждого ввода/вывода</small></div>
          <div class="card cta-stat"><b>$20B+</b><small>объём крипторынка РФ/год</small></div>
          <div class="card cta-stat"><b>0.05-0.3%</b><small>эквайринг сделок</small></div>
          <div class="card cta-stat"><b>01.09.2026</b><small>цифровой рубль — старт</small></div>
        </div>
        <div class="cta-badges"><span class="partner-badge">ВТБ (ГОСТ TLS)</span><span class="partner-badge">Альфа-Банк (REST)</span><span class="partner-badge">Сбербанк</span></div>
        <p class="cta-footer">РусКрипто © 2026 • ФЗ-259 • ФЗ-1194918-8 • ФЗ-115 • ЦБ РФ: цифровой рубль</p>
      </div>` },
]

// CSS — точно повторяет Tailwind-классы из оригинала (тёмная тема золото+navy)
const css = `
:root {
  --bg: #0B1426; --card: #1a1f3a; --border: #ffffff14; --text: #ededed; --muted: #888;
  --primary: #F0B90B; --success: #22c55e; --danger: #ef4444; --sky: #38bdf8; --violet: #a78bfa; --amber: #F0B90B;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
.slide { width: 1920px; height: 1080px; padding: 48px 64px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; page-break-after: always; }
h1 { font-size: 72px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; text-align: center; }
h2 { font-size: 40px; font-weight: 700; text-align: center; }
h3 { font-size: 20px; font-weight: 700; }
p { line-height: 1.5; }
.subtitle { font-size: 28px; color: var(--primary); margin-bottom: 6px; text-align: center; }
.laws { font-size: 16px; color: var(--muted); max-width: 900px; margin: 0 auto 24px; text-align: center; }
.badge { display: inline-block; padding: 8px 20px; border: 1px solid #F0B90B40; border-radius: 24px; color: var(--primary); font-size: 16px; margin-top: 8px; }
.logo-big { width: 96px; height: 96px; border-radius: 28px; background: linear-gradient(135deg, #FCD535, #F0B90B); display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 900; color: #000; margin: 0 auto 24px; box-shadow: 0 20px 60px #F0B90B30; }
.slide-title { text-align: center; align-items: center; justify-content: center; }
.slide-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.header-icon { width: 48px; height: 48px; border-radius: 14px; background: #F0B90B20; display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
.header-icon svg { width: 24px; height: 24px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
.flow-card { padding: 20px 24px; }
.flow-section { margin-bottom: 8px; }
.flow-label { text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 8px 0 6px; }
.flow-in { color: var(--success); }
.flow-out { color: var(--danger); }
.flow-row { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 6px; }
.node { width: 120px; text-align: center; flex-shrink: 0; }
.node-icon { width: 56px; height: 56px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; font-size: 28px; }
.node-user .node-icon { background: #38bdf820; }
.node-bank .node-icon { background: #F0B90B20; }
.node-exchange .node-icon { background: #F0B90B20; }
.node-crypto .node-icon { background: #a78bfa20; }
.node-label { font-size: 14px; font-weight: 600; }
.node-sub { font-size: 11px; color: var(--muted); }
.arrow { flex: 1; text-align: center; padding: 4px 0; position: relative; }
.arrow-label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 2px; }
.arrow-line { display: block; height: 2px; border-radius: 1px; position: relative; }
.arrow-line::after { content: '→'; position: absolute; right: -6px; top: -11px; font-size: 20px; }
.arrow-fee { display: block; font-size: 10px; margin-top: 2px; }
.arrow-success .arrow-label { color: var(--success); }
.arrow-success .arrow-line { background: #22c55e50; }
.arrow-success .arrow-line::after { color: var(--success); }
.arrow-success .arrow-fee { color: var(--amber); }
.arrow-primary .arrow-label { color: var(--primary); }
.arrow-primary .arrow-line { background: #F0B90B50; }
.arrow-primary .arrow-line::after { color: var(--primary); }
.arrow-primary .arrow-fee { color: var(--muted); }
.arrow-danger .arrow-label { color: var(--danger); }
.arrow-danger .arrow-line { background: #ef444450; }
.arrow-danger .arrow-line::after { color: var(--danger); }
.arrow-danger .arrow-fee { color: var(--amber); }
.roles-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; border-top: 1px solid var(--border); padding-top: 12px; }
.role-card { border-radius: 14px; padding: 14px; border: 1px solid; }
.role-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.role-icon { font-size: 20px; }
.role-card b { font-size: 15px; }
.role-card ul { list-style: none; }
.role-card li { font-size: 12px; color: var(--muted); margin: 3px 0; }
.role-admin { border-color: #F0B90B25; background: #F0B90B08; }
.role-compliance { border-color: #ef444425; background: #ef444408; }
.role-finance { border-color: #F0B90B25; background: #F0B90B08; }
.role-bank { border-color: #38bdf825; background: #38bdf808; }
.aml-bar { background: #ef444408; border: 1px solid #ef444420; border-radius: 12px; padding: 10px; text-align: center; font-size: 14px; color: var(--muted); margin: 10px 0; }
.bank-output { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; background: #38bdf808; border: 1px solid #38bdf820; font-size: 13px; color: var(--muted); margin: 10px 0; }
.bank-output-icon { font-size: 20px; flex-shrink: 0; }
.bank-output-text { flex: 1; }
.bank-output-text b { color: var(--sky); font-size: 15px; }
.bank-output-arrow { font-size: 18px; color: var(--sky); flex-shrink: 0; }
.fees-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
.fee-card { text-align: center; padding: 12px; border-radius: 12px; }
.fee-value { font-size: 28px; font-weight: 700; }
.fee-label { font-size: 12px; color: var(--muted); margin-top: 2px; }
.fee-bank { background: #F0B90B08; border: 1px solid #F0B90B20; }
.fee-bank .fee-value { color: var(--amber); }
.fee-exchange { background: #F0B90B08; border: 1px solid #F0B90B20; }
.fee-exchange .fee-value { color: var(--primary); }
.fee-output { background: #22c55e08; border: 1px solid #22c55e20; }
.fee-output .fee-value { color: var(--success); }
.flow-summary { text-align: center; font-size: 14px; color: var(--muted); margin-top: 12px; }
.revenue-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
.revenue-card { padding: 24px; }
.revenue-header { font-weight: 700; font-size: 18px; margin-bottom: 16px; padding: 8px 14px; border-radius: 10px; }
.revenue-in { background: #22c55e15; color: var(--success); }
.revenue-out { background: #ef444415; color: var(--danger); }
.revenue-step { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 10px; background: #1a2332; margin-bottom: 8px; }
.step-num { width: 32px; height: 32px; border-radius: 50%; background: #F0B90B20; color: var(--primary); font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-info { flex: 1; font-size: 16px; }
.step-info small { font-size: 13px; color: var(--muted); }
.step-fee { text-align: right; font-size: 18px; font-weight: 700; color: var(--amber); }
.step-fee small { display: block; font-size: 12px; color: var(--muted); font-weight: 400; }
.revenue-total { text-align: center; padding: 12px; border-radius: 10px; background: #F0B90B10; border: 1px solid #F0B90B20; font-size: 16px; color: var(--muted); margin-top: 12px; }
.revenue-total b { color: var(--amber); font-size: 24px; }
.trading-bar { display: flex; align-items: center; justify-content: center; gap: 28px; padding: 16px; border-radius: 12px; background: #F0B90B08; border: 1px solid #F0B90B20; font-size: 18px; }
.trading-bar b { color: var(--primary); }
.legal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.legal-card { padding: 20px; }
.legal-badge { display: inline-block; padding: 4px 14px; border: 1px solid #F0B90B40; border-radius: 16px; color: var(--primary); font-size: 14px; margin-bottom: 8px; }
.legal-card b { font-size: 18px; display: block; margin-bottom: 6px; }
.legal-card p { font-size: 14px; color: var(--muted); margin-bottom: 10px; }
.legal-card ul { list-style: none; }
.legal-card li { font-size: 14px; margin: 4px 0; }
.legal-note { padding: 16px; border-radius: 12px; background: #F0B90B08; border: 1px solid #F0B90B20; font-size: 17px; color: var(--muted); display: flex; align-items: center; gap: 12px; }
.legal-note b { color: var(--primary); }
.slide-cta { text-align: center; align-items: center; justify-content: center; }
.cta-icon { color: var(--primary); margin-bottom: 20px; display: flex; justify-content: center; }
.cta-icon svg { width: 64px; height: 64px; }
.cta-desc { font-size: 22px; color: var(--muted); max-width: 900px; margin: 0 auto 28px; text-align: center; }
.cta-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; max-width: 1100px; }
.cta-stat { padding: 20px; text-align: center; }
.cta-stat b { font-size: 32px; color: var(--primary); display: block; }
.cta-stat small { font-size: 14px; color: var(--muted); }
.cta-badges { display: flex; gap: 14px; justify-content: center; margin-bottom: 20px; }
.partner-badge { padding: 6px 20px; border: 1px solid #F0B90B40; border-radius: 20px; color: var(--primary); font-size: 17px; }
.cta-footer { font-size: 16px; color: #555; text-align: center; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
@keyframes slideInR { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
.slide.active { animation: fadeIn 0.6s ease-out; }
.slide.active .node { animation: scaleIn 0.4s ease-out backwards; }
.slide.active .role-card { animation: fadeIn 0.4s ease-out backwards; }
.slide.active .revenue-card { animation: slideInR 0.5s ease-out backwards; }
.slide.active .legal-card { animation: fadeIn 0.4s ease-out backwards; }
`

const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920">
<title>РусКрипто — Презентация</title>
<style>
${css}
body { display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
.slide { display: none; }
.slide.active { display: flex; }
.nav-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 48px; background: #111827cc; backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-top: 1px solid #333; z-index: 100; }
.nav-btn { background: none; border: 1px solid #444; color: #ccc; padding: 6px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.nav-btn:hover { background: #F0B90B15; border-color: #F0B90B; color: #F0B90B; }
.nav-btn:disabled { opacity: 0.3; cursor: default; }
.nav-dots { display: flex; gap: 6px; }
.nav-dot { width: 8px; height: 8px; border-radius: 50%; background: #444; cursor: pointer; border: none; padding: 0; }
.nav-dot.active { background: #F0B90B; width: 24px; border-radius: 4px; }
.top-bar { position: fixed; top: 0; left: 0; right: 0; height: 36px; background: #111827cc; backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #333; z-index: 100; font-size: 13px; }
.progress-bar { flex: 1; max-width: 200px; height: 3px; background: #333; border-radius: 2px; margin: 0 16px; overflow: hidden; }
.progress-fill { height: 100%; background: #F0B90B; border-radius: 2px; transition: width 0.3s; }
@media print { .nav-bar, .top-bar { display: none; } .slide { display: flex !important; } }
</style></head><body>
<div class="top-bar"><span>₿ РусКрипто — Презентация</span><div class="progress-bar"><div class="progress-fill" id="progress"></div></div><span id="counter">1 / ${slidesData.length}</span></div>
${slidesData.map((s,i) => { const m = s.html.match(/<div class="slide([^"]*)">/); const extra = m ? m[1].trim() : ''; const inner = s.html.replace(/<div class="slide[^"]*">/, '').replace(/<\/div>\s*$/, ''); return `<div class="slide ${extra} ${i===0?'active':''}" data-index="${i}">${inner}</div>`; }).join('\n')}
<div class="nav-bar"><button class="nav-btn" id="prev" onclick="nav(-1)">← Назад</button><div class="nav-dots">${slidesData.map((_,i)=>`<button class="nav-dot ${i===0?'active':''}" onclick="goTo(${i})"></button>`).join('')}</div><button class="nav-btn" id="next" onclick="nav(1)">Далее →</button></div>
<script>
let c=0;const s=document.querySelectorAll('.slide'),d=document.querySelectorAll('.nav-dot'),t=s.length;
function show(n){s.forEach((e,i)=>e.classList.toggle('active',i===n));d.forEach((e,i)=>e.classList.toggle('active',i===n));document.getElementById('counter').textContent=(n+1)+' / '+t;document.getElementById('progress').style.width=((n+1)/t*100)+'%';document.getElementById('prev').disabled=n===0;document.getElementById('next').disabled=n===t-1;c=n}
function nav(d){show(Math.max(0,Math.min(t-1,c+d)))}
function goTo(n){show(n)}
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')nav(1);if(e.key==='ArrowLeft')nav(-1)});
show(0);
</script></body></html>`

const pdfHtml = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><title>РусКрипто — PDF</title>
<style>${css}.slide{display:flex}@media print{body{background:#fff}}</style>
</head><body>${slidesData.map(s=>s.html).join('\n')}</body></html>`

mkdirSync(OUTPUT_DIR, { recursive: true })
writeFileSync(`${OUTPUT_DIR}/presentation.html`, html, 'utf-8')
writeFileSync(`${OUTPUT_DIR}/presentation-pdf.html`, pdfHtml, 'utf-8')
console.log(`✅ Generated:\n   📄 ${OUTPUT_DIR}/presentation.html — 1920×1080 интерактивная (←/→)\n   📄 ${OUTPUT_DIR}/presentation-pdf.html — 1920×1080 для PDF (Ctrl+P)\n   📊 ${slidesData.length} слайдов`)
