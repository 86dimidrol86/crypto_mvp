'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { OrderBookLevel, OrderSide } from './types'

export interface LiveTrade {
  id: string
  pair: string
  price: number
  amount: number
  side: OrderSide
  time: string
}

export interface LiveOrderBook {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  spread: number
  midPrice: number
}

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    // Caddy gateway: path "/" + XTransformPort=3003 query
    socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return socket
}

export function useLiveMarket(pair: string) {
  const [orderBook, setOrderBook] = useState<LiveOrderBook | null>(null)
  const [livePrice, setLivePrice] = useState<number>(0)
  const [trades, setTrades] = useState<LiveTrade[]>([])
  const [connected, setConnected] = useState(false)
  const sRef = useRef<Socket | null>(null)

  useEffect(() => {
    const s = getSocket()
    sRef.current = s

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)

    s.emit('subscribe', pair)

    const onOrderbook = (data: { pair: string } & LiveOrderBook) => {
      if (data.pair === pair) {
        setOrderBook({
          bids: data.bids,
          asks: data.asks,
          spread: data.spread,
          midPrice: data.midPrice,
        })
      }
    }
    const onPrice = (data: { pair: string; price: number }) => {
      if (data.pair === pair) setLivePrice(data.price)
    }
    const onTrade = (data: LiveTrade) => {
      if (data.pair === pair) {
        setTrades((prev) => [data, ...prev].slice(0, 25))
      }
    }
    const onTrades = (data: { pair: string; trades: LiveTrade[] }) => {
      if (data.pair === pair) setTrades(data.trades)
    }

    s.on('orderbook', onOrderbook)
    s.on('price', onPrice)
    s.on('trade', onTrade)
    s.on('trades', onTrades)

    return () => {
      s.emit('unsubscribe', pair)
      s.off('orderbook', onOrderbook)
      s.off('price', onPrice)
      s.off('trade', onTrade)
      s.off('trades', onTrades)
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [pair])

  return { orderBook, livePrice, trades, connected }
}
