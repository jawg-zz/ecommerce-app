'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'
import { useToast } from '@/components/Toast'
import { formatPrice } from '@/lib/utils'
import {
  validatePhone,
  validatePhoneForDisplay,
  validateRequired,
  getMpesaErrorMessage,
  isNetworkError,
} from '@/lib/validation'

type CheckoutStep = 'form' | 'processing' | 'success'

const PAYMENT_TIMEOUT_SECONDS = 120

interface FormErrors {
  name?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, cart, setCart, refreshCart } = useApp()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<CheckoutStep>('form')
  const [phone, setPhone] = useState('')
  const [phoneValid, setPhoneValid] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(PAYMENT_TIMEOUT_SECONDS)
  const [phoneError, setPhoneError] = useState('')
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cancelRef = useRef(false)
  const retryDataRef = useRef<{ shippingAddress: typeof shippingAddress; phone: string } | null>(null)

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

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const validateField = (field: keyof FormErrors, value: string) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Full name is required'
        if (value.trim().length < 2) return 'Name must be at least 2 characters'
        return undefined
      case 'address':
        if (!value.trim()) return 'Address is required'
        if (value.trim().length < 5) return 'Address must be at least 5 characters'
        return undefined
      case 'city':
        if (!value.trim()) return 'City is required'
        if (value.trim().length < 2) return 'City must be at least 2 characters'
        return undefined
      case 'state':
        if (!value.trim()) return 'County is required'
        if (value.trim().length < 2) return 'County must be at least 2 characters'
        return undefined
      case 'zipCode':
        if (!value.trim()) return 'ZIP code is required'
        if (value.trim().length < 3) return 'ZIP code must be at least 3 characters'
        return undefined
      default:
        return undefined
    }
  }

  const handleAddressChange = (field: keyof typeof shippingAddress, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }))
    
    if (touched[field]) {
      const error = field in formErrors ? validateField(field as keyof FormErrors, value) : undefined
      setFormErrors((prev) => ({ ...prev, [field]: error }))
    }
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const value = shippingAddress[field as keyof typeof shippingAddress]
    const error = validateField(field as keyof FormErrors, value)
    setFormErrors((prev) => ({ ...prev, [field]: error }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPhone(value)
    
    if (value) {
      const validation = validatePhone(value)
      if (!validation.isValid) {
        setPhoneError(validation.error || 'Invalid phone number')
        setPhoneValid(false)
      } else {
        setPhoneError('')
        setPhoneValid(true)
      }
    } else {
      setPhoneError('')
      setPhoneValid(false)
    }
  }

  const isFormValid = () => {
    const nameError = validateField('name', shippingAddress.name)
    const addressError = validateField('address', shippingAddress.address)
    const cityError = validateField('city', shippingAddress.city)
    const stateError = validateField('state', shippingAddress.state)
    const zipCodeError = validateField('zipCode', shippingAddress.zipCode)
    const phoneValidation = validatePhone(phone)

    return !nameError && !addressError && !cityError && !stateError && !zipCodeError && phoneValidation.isValid
  }

  const cancelPayment = useCallback(() => {
    cancelRef.current = true
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setStep('form')
    setError('')
    setTimeRemaining(PAYMENT_TIMEOUT_SECONDS)
  }, [])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRetry = () => {
    if (retryDataRef.current) {
      retryPayment(retryDataRef.current.shippingAddress, retryDataRef.current.phone)
    }
  }

  const retryPayment = async (address: typeof shippingAddress, phoneNumber: string) => {
    setError('')
    setProcessing(true)
    cancelRef.current = false

    setLoading(true)
    setStatusMessage('Initiating payment...')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddress: address, phone: phoneNumber }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errorCode) {
          setError(getMpesaErrorMessage(data.errorCode))
        } else {
          setError(data.error || 'Checkout failed')
        }
        setProcessing(false)
        setLoading(false)
        return
      }

      setCheckoutRequestId(data.checkoutRequestId)
      setStep('processing')
      setLoading(false)
      setStatusMessage('Check your phone for the M-Pesa prompt!')
      setTimeRemaining(PAYMENT_TIMEOUT_SECONDS)

      pollPaymentStatus(data.checkoutRequestId, address)
    } catch (err) {
      if (isNetworkError(err)) {
        setError('Unable to connect. Please check your internet connection.')
      } else {
        setError('An error occurred during checkout')
      }
      setProcessing(false)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, address: true, city: true, state: true, zipCode: true })
    
    const nameError = validateField('name', shippingAddress.name)
    const addressError = validateField('address', shippingAddress.address)
    const cityError = validateField('city', shippingAddress.city)
    const stateError = validateField('state', shippingAddress.state)
    const zipCodeError = validateField('zipCode', shippingAddress.zipCode)
    const phoneValidation = validatePhone(phone)

    setFormErrors({
      name: nameError,
      address: addressError,
      city: cityError,
      state: stateError,
      zipCode: zipCodeError,
    })

    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || 'Please enter a valid phone number')
    }

    if (nameError || addressError || cityError || stateError || zipCodeError || !phoneValidation.isValid) {
      return
    }

    retryDataRef.current = { shippingAddress, phone }
    retryPayment(shippingAddress, phone)
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

        if (data.errorCode) {
          clearInterval(timerInterval)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          setError(getMpesaErrorMessage(data.errorCode))
          setStep('form')
          return
        }

        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval)
            setError('Payment timed out. Please try again.')
            setStep('form')
            return 0
          }
          return prev
        })

        setStatusMessage('Waiting for payment confirmation...')
        pollIntervalRef.current = setTimeout(poll, 3000)
      } catch {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval)
            setError('Failed to verify payment. Please try again.')
            setStep('form')
            return 0
          }
          return prev
        })
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

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                  {error}
                  {error && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="ml-2 text-red-700 underline font-medium hover:text-red-800"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.name}
                    onChange={(e) => handleAddressChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    className={`input-field ${touched.name && formErrors.name ? 'border-red-500' : ''}`}
                    placeholder="John Doe"
                  />
                  {touched.name && formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.address}
                    onChange={(e) => handleAddressChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                    className={`input-field ${touched.address && formErrors.address ? 'border-red-500' : ''}`}
                    placeholder="123 Main Street"
                  />
                  {touched.address && formErrors.address && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      onBlur={() => handleBlur('city')}
                      className={`input-field ${touched.city && formErrors.city ? 'border-red-500' : ''}`}
                      placeholder="Nairobi"
                    />
                    {touched.city && formErrors.city && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      County <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      onBlur={() => handleBlur('state')}
                      className={`input-field ${touched.state && formErrors.state ? 'border-red-500' : ''}`}
                      placeholder="Nairobi"
                    />
                    {touched.state && formErrors.state && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.state}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.zipCode}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      onBlur={() => handleBlur('zipCode')}
                      className={`input-field ${touched.zipCode && formErrors.zipCode ? 'border-red-500' : ''}`}
                      placeholder="00100"
                    />
                    {touched.zipCode && formErrors.zipCode && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.zipCode}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={shippingAddress.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
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
                    M-Pesa Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="0712345678 or 254712345678"
                      value={phone}
                      onChange={handlePhoneChange}
                      className={`input-field pr-10 ${phoneError && phone ? 'border-red-500' : ''} ${phoneValid ? 'border-green-500' : ''}`}
                    />
                    {phoneValid && (
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  {phoneError && phone && (
                    <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                  )}
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
              onClick={handleSubmit}
              disabled={processing || !isFormValid()}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  Pay {formatPrice(cart.total)} with M-Pesa
                </>
              )}
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
