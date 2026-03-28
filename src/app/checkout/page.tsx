'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'
import { formatPrice } from '@/lib/utils'

type CheckoutStep = 'form' | 'processing' | 'success'

const PAYMENT_TIMEOUT_SECONDS = 120

export default function CheckoutPage() {
  const router = useRouter()
  const { user, cart, setCart, refreshCart } = useApp()
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<CheckoutStep>('form')
  const [phone, setPhone] = useState('')
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(PAYMENT_TIMEOUT_SECONDS)
  const [phoneError, setPhoneError] = useState('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cancelRef = useRef(false)

  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'KE',
  })

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    refreshCart()
  }, [user, router, refreshCart])

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      return cleaned.length === 10
    }
    if (cleaned.startsWith('254')) {
      return cleaned.length === 12
    }
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      return cleaned.length === 9
    }
    return false
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPhone(value)
    if (value && !validatePhone(value)) {
      setPhoneError('Please enter a valid phone number (e.g., 0712345678 or 254712345678)')
    } else {
      setPhoneError('')
    }
  }

  const cancelPayment = useCallback(() => {
    cancelRef.current = true
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setStep('form')
    setError('Payment cancelled')
    setTimeRemaining(PAYMENT_TIMEOUT_SECONDS)
  }, [])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPhoneForDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('254')) {
      return `0${cleaned.slice(3)}`
    }
    return phone
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')
    cancelRef.current = false

    if (!validatePhone(phone)) {
      setPhoneError('Please enter a valid Kenyan phone number (e.g., 0712345678 or 254712345678)')
      setProcessing(false)
      return
    }

    setLoading(true)
    setStatusMessage('Initiating payment...')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddress, phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Checkout failed')
        setProcessing(false)
        setLoading(false)
        return
      }

      setCheckoutRequestId(data.checkoutRequestId)
      setStep('processing')
      setLoading(false)
      setStatusMessage('Check your phone for the M-Pesa prompt!')
      setTimeRemaining(PAYMENT_TIMEOUT_SECONDS)

      pollPaymentStatus(data.checkoutRequestId, shippingAddress)
    } catch {
      setError('An error occurred during checkout')
      setProcessing(false)
      setLoading(false)
    }
  }

  const pollPaymentStatus = async (checkoutId: string, address: typeof shippingAddress) => {
    const timerInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          setError('Payment timed out. Please try again.')
          setStep('form')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const poll = async () => {
      if (cancelRef.current) {
        clearInterval(timerInterval)
        return
      }

      try {
        const res = await fetch(`/api/checkout?checkoutRequestId=${checkoutId}`)
        const data = await res.json()

        if (data.status === 'success') {
          clearInterval(timerInterval)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          setStatusMessage('Payment confirmed! Processing your order...')

          const completeRes = await fetch('/api/checkout', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checkoutRequestId,
              shippingAddress: address,
            }),
          })

          if (completeRes.ok) {
            setStep('success')
            setCart({ items: [], total: 0 })
            router.push(`/orders?success=true`)
          } else {
            setError('Failed to complete order')
            setStep('form')
          }
          return
        }

        if (timeRemaining <= 1) {
          clearInterval(timerInterval)
          setError('Payment timed out. Please try again.')
          setStep('form')
          return
        }

        setStatusMessage('Waiting for payment confirmation...')
        pollIntervalRef.current = setTimeout(poll, 3000)
      } catch {
        if (timeRemaining <= 1) {
          clearInterval(timerInterval)
          setError('Failed to verify payment. Please try again.')
          setStep('form')
          return
        }
        pollIntervalRef.current = setTimeout(poll, 3000)
      }
    }

    pollIntervalRef.current = setTimeout(poll, 3000)
  }

  if (!user) {
    return null
  }

  if (cart.items.length === 0) {
    return (
      <div className="py-8">
        <div className="container-custom text-center">
          <h1 className="text-2xl font-bold mb-4">Checkout</h1>
          <p className="text-slate-500 mb-6">Your cart is empty.</p>
          <Link href="/products" className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="max-w-md mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">M-Pesa Payment</h2>
            <p className="text-slate-600 mb-4">{statusMessage}</p>
            
            <div className="bg-slate-100 rounded-lg p-4 mb-6">
              <div className="text-3xl font-mono font-bold text-slate-700">
                {formatTime(timeRemaining)}
              </div>
              <p className="text-sm text-slate-500 mt-1">Payment expires in</p>
            </div>

            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            ) : (
              <p className="text-sm text-slate-500 mb-6">
                Check your phone for the M-Pesa prompt and enter your PIN to confirm
              </p>
            )}

            <button
              onClick={cancelPayment}
              className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="card p-6">
              <h2 className="text-lg font-semibold mb-6">Shipping Address</h2>

              {(error || phoneError) && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                  {error || phoneError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.name}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, name: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.address}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, address: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, city: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, state: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.zipCode}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, zipCode: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Country
                    </label>
                    <select
                      value={shippingAddress.country}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, country: e.target.value })
                      }
                      className="input-field"
                    >
                      <option value="KE">Kenya</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0712345678 or 254712345678"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="input-field"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter phone number (e.g., 0712345678 or 254712345678)
                  </p>
                </div>
              </div>
            </form>
          </div>

          <div className="card p-6 h-fit sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {item.product.name} x {item.quantity}
                  </span>
                  <span>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mb-6">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              onClick={handleSubmit}
              disabled={processing}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              {processing ? 'Processing...' : `Pay ${formatPrice(cart.total)} with M-Pesa`}
            </button>

            <div className="bg-green-50 p-3 rounded-lg mt-4">
              <p className="text-xs text-green-700 text-center">
                You will receive a payment prompt on your phone
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
