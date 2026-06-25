import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const PORT = 3003

const httpServer = createServer((req, res) => {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    return res.end()
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ service: 'ruscrypto-market', status: 'ok', port: PORT }))
})

const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
})

// Базовые цены для каждой пары (RUB котировки)
const PAIRS: Record<string, { base: number; symbol: string }> = {
  'BTC/RUB': { base: 4580000, symbol: 'BTC' },
  'ETH/RUB': { base: 122000, symbol: 'ETH' },
  'XRP/RUB': { base: 80.3, symbol: 'XRP' },
  'SOL/RUB': { base: 5100, symbol: 'SOL' },
  'BNB/RUB': { base: 42400, symbol: 'BNB' },
  'DOGE/RUB': { base: 5.7, symbol: 'DOGE' },
  'ADA/RUB': { base: 11.1, symbol: 'ADA' },
  'AVAX/RUB': { base: 482, symbol: 'AVAX' },
}

// Генерация стакана
function generateOrderBook(pair: string) {
  const config = PAIRS[pair]
  if (!config) return null
  const base = config.base
  const tickSize = base * 0.0001 // 0.01% шаг

  const bids: { price: number; amount: number; total: number }[] = []
  const asks: { price: number; amount: number; total: number }[] = []

  let bidAccum = 0
  let askAccum = 0
  for (let i = 0; i < 12; i++) {
    const bidPrice = Math.floor(base - (i + 1) * tickSize * (1 + Math.random() * 2))
    const bidAmount = parseFloat((0.5 + Math.random() * 4).toFixed(3))
    bidAccum += bidAmount
    bids.push({ price: bidPrice, amount: bidAmount, total: bidAccum })

    const askPrice = Math.floor(base + (i + 1) * tickSize * (1 + Math.random() * 2))
    const askAmount = parseFloat((0.4 + Math.random() * 3.5).toFixed(3))
    askAccum += askAmount
    asks.push({ price: askPrice, amount: askAmount, total: askAccum })
  }
  return { bids, asks, spread: asks[0].price - bids[0].price, midPrice: base }
}

// Генерация тиков цены (микросимуляция)
let priceState: Record<string, number> = {}
Object.keys(PAIRS).forEach((p) => (priceState[p] = PAIRS[p].base))

function tickPrice(pair: string): number {
  const old = priceState[pair]
  const change = (Math.random() - 0.5) * 0.003
  priceState[pair] = Math.max(old * (1 + change), 0.01)
  return priceState[pair]
}

// Лента последних сделок
const recentTrades: Record<string, any[]> = {}
Object.keys(PAIRS).forEach((p) => (recentTrades[p] = []))

function generateTrade(pair: string) {
  const price = priceState[pair]
  const side = Math.random() > 0.5 ? 'buy' : 'sell'
  const amount = parseFloat((0.001 + Math.random() * 2).toFixed(4))
  const trade = {
    id: Math.random().toString(36).slice(2, 9),
    pair,
    price,
    amount,
    side,
    time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
  if (!recentTrades[pair]) recentTrades[pair] = []
  recentTrades[pair].unshift(trade)
  recentTrades[pair] = recentTrades[pair].slice(0, 25)
  return trade
}

io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`)

  // Подписка на пару
  socket.on('subscribe', (pair: string) => {
    if (!PAIRS[pair]) return
    socket.join(`pair:${pair}`)
    console.log(`  ${socket.id} subscribed to ${pair}`)

    // Сразу отправить текущее состояние
    socket.emit('orderbook', { pair, ...generateOrderBook(pair)! })
    socket.emit('price', { pair, price: priceState[pair] })
    if (recentTrades[pair]) {
      socket.emit('trades', { pair, trades: recentTrades[pair].slice(0, 15) })
    }
  })

  socket.on('unsubscribe', (pair: string) => {
    socket.leave(`pair:${pair}`)
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

// Тиковый генератор — каждые 1.5с обновляем цены и стаканы
setInterval(() => {
  Object.keys(PAIRS).forEach((pair) => {
    const newPrice = tickPrice(pair)
    PAIRS[pair].base = newPrice

    // Цена
    io.to(`pair:${pair}`).emit('price', { pair, price: newPrice })

    // Стакан (каждые 2 тика)
    if (Math.random() > 0.4) {
      io.to(`pair:${pair}`).emit('orderbook', { pair, ...generateOrderBook(pair)! })
    }

    // Случайная сделка
    if (Math.random() > 0.5) {
      const trade = generateTrade(pair)
      io.to(`pair:${pair}`).emit('trade', trade)
    }
  })
}, 1500)

httpServer.listen(PORT, () => {
  console.log(`🚀 РусКрипто Market Service running on port ${PORT}`)
  console.log(`   WebSocket: ws://localhost:${PORT}/`)
  console.log(`   Pairs: ${Object.keys(PAIRS).join(', ')}`)
})
