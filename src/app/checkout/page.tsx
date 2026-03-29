'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'
import { formatPrice } from '@/lib/utils'
import {
  validatePhone,
  getMpesaErrorMessage,
  isNetworkError,
} from '@/lib/validation'
import { KENYA_COUNTIES, ShippingAddress } from '@/types'

type CheckoutStep = 'shipping' | 'payment' | 'confirmation'

const PAYMENT_TIMEOUT_SECONDS = 120

interface FormErrors {
  name?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

interface SavedAddress {
  address: ShippingAddress
  phone: string
}

function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 4) return cleaned
  if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`
}

function formatPhoneForDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return `+254 ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `0${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }
  return formatPhoneNumber(cleaned)
}

function getEstimatedDelivery(): string {
  const today = new Date()
  const deliveryDate = new Date(today)
  deliveryDate.setDate(today.getDate() + 3)
  return deliveryDate.toLocaleDateString('en-KE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function CheckoutSteps({ currentStep }: { currentStep: CheckoutStep }) {
  const steps: { key: CheckoutStep; label: string; icon: JSX.Element }[] = [
    { 
      key: 'shipping', 
      label: 'Shipping',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      key: 'payment', 
      label: 'Payment',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    { 
      key: 'confirmation', 
      label: 'Confirmation',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ]

  const getStepStatus = (stepKey: CheckoutStep) => {
    const stepIndex = steps.findIndex(s => s.key === stepKey)
    const currentIndex = steps.findIndex(s => s.key === currentStep)
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-center max-w-lg mx-auto">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key)
          const isLast = index === steps.length - 1
          
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-md ${
                    status === 'completed'
                      ? 'bg-gradient-to-br from-green-400 to-green-500 text-white scale-100'
                      : status === 'current'
                      ? 'bg-gradient-to-br from-sky-400 to-sky-500 text-white scale-110 shadow-lg'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {status === 'completed' ? (
                    <svg className="w-6 h-6 animate-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : status === 'current' ? (
                    <div className="relative">
                      {step.icon}
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full">
                        <span className="absolute inset-0 rounded-full bg-sky-400 animate-ping opacity-75"></span>
                      </span>
                    </div>
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`absolute -bottom-6 text-xs font-medium whitespace-nowrap ${
                  status === 'current' 
                    ? 'text-sky-600' 
                    : status === 'completed'
                      ? 'text-green-600'
                      : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
              
              {!isLast && (
                <div className="flex-1 h-0.5 mx-3 relative overflow-hidden rounded-full">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      getStepStatus(steps[index + 1].key) === 'completed' ||
                      getStepStatus(steps[index + 1].key) === 'current'
                        ? 'w-full bg-gradient-to-r from-green-400 to-green-500'
                        : 'w-0 bg-slate-200'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SecurityBadges() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>SSL Secured</span>
      </div>
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <span>Your information is secure</span>
      </div>
      <div className="flex items-center gap-1">
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span>M-Pesa Trusted</span>
      </div>
    </div>
  )
}

function CheckoutPageContent() {
  const router = useRouter()
  const { user, cart, setCart, refreshCart } = useApp()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping')
  const [phone, setPhone] = useState('')
  const [phoneValid, setPhoneValid] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(PAYMENT_TIMEOUT_SECONDS)
  const [phoneError, setPhoneError] = useState('')
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [useSavedAddress, setUseSavedAddress] = useState(false)
  const [cartWarning, setCartWarning] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [paymentPhone, setPaymentPhone] = useState('')
  const [paymentStage, setPaymentStage] = useState<'sending' | 'waiting' | 'polling' | 'success'>('sending')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cancelRef = useRef(false)
  const retryDataRef = useRef<{ shippingAddress: ShippingAddress; phone: string; orderId?: string } | null>(null)
  const initialCartRef = useRef<string>('')

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
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
    const fetchSavedAddresses = async () => {
      if (!user) return
      try {
        const res = await fetch('/api/orders')
        if (res.ok) {
          const orders = await res.json()
          const addresses: SavedAddress[] = []
          const seen = new Set<string>()
          orders.forEach((order: { shippingAddress: ShippingAddress | null }) => {
            if (order.shippingAddress) {
              const key = JSON.stringify(order.shippingAddress)
              if (!seen.has(key)) {
                seen.add(key)
                addresses.push({
                  address: order.shippingAddress,
                  phone: '',
                })
              }
            }
          })
          setSavedAddresses(addresses.slice(0, 3))
        }
      } catch (e) {
        console.error('Failed to fetch saved addresses:', e)
      }
    }
    fetchSavedAddresses()
  }, [user])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (cart.items.length > 0 && initialCartRef.current) {
      const initialItems = JSON.parse(initialCartRef.current)
      const currentIds = cart.items.map(i => `${i.productId}:${i.quantity}`)
      const initialIds = initialItems.map((i: { productId: string; quantity: number }) => `${i.productId}:${i.quantity}`)
      
      const hasChanged = currentIds.some((id: string) => !initialIds.includes(id)) || 
                        initialIds.some((id: string) => !currentIds.includes(id))
      
      if (hasChanged) {
        setCartWarning('Your cart has changed. Please review before completing payment.')
      }
    } else if (cart.items.length > 0) {
      initialCartRef.current = JSON.stringify(cart.items.map(i => ({ productId: i.productId, quantity: i.quantity })))
    }
  }, [cart.items, setCart])

  useEffect(() => {
    if (cart.items.length === 0 && currentStep !== 'confirmation') {
      router.push('/cart')
    }
  }, [cart.items.length, currentStep, router])

  const handleUseSavedAddress = (saved: SavedAddress) => {
    setShippingAddress(saved.address)
    if (saved.phone) {
      setPhone(saved.phone)
      const validation = validatePhone(saved.phone)
      setPhoneValid(validation.isValid)
    }
    setUseSavedAddress(false)
  }

  const validateField = (field: keyof FormErrors, value: string) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Full name is required'
        if (value.trim().length < 2) return 'Name must be at least 2 characters'
        if (!/^[a-zA-Z\s'-]+$/.test(value)) return 'Name contains invalid characters'
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
        return undefined
      case 'zipCode':
        if (!value.trim()) return 'ZIP code is required'
        if (!/^\d{5,6}$/.test(value.replace(/\s/g, ''))) return 'ZIP code must be 5-6 digits'
        return undefined
      default:
        return undefined
    }
  }

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
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
    const formatted = formatPhoneNumber(value)
    setPhone(formatted)
    
    const cleaned = formatted.replace(/\D/g, '')
    if (cleaned.length > 0) {
      const validation = validatePhone(cleaned)
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

  const isFormValid = useCallback(() => {
    const nameError = validateField('name', shippingAddress.name)
    const addressError = validateField('address', shippingAddress.address)
    const cityError = validateField('city', shippingAddress.city)
    const stateError = validateField('state', shippingAddress.state)
    const zipCodeError = validateField('zipCode', shippingAddress.zipCode)
    const phoneValidation = validatePhone(phone.replace(/\D/g, ''))

    return !nameError && !addressError && !cityError && !stateError && !zipCodeError && phoneValidation.isValid
  }, [shippingAddress, phone])

  const cancelPayment = useCallback(() => {
    cancelRef.current = true
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setCurrentStep('shipping')
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

  const retryPayment = async (address: ShippingAddress, phoneNumber: string) => {
    setError('')
    setProcessing(true)
    cancelRef.current = false
    setPaymentStage('sending')
    setStatusMessage('Sending payment request...')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shippingAddress: address, phoneNumber }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errorCode) {
          setError(getMpesaErrorMessage(data.errorCode))
        } else {
          setError(data.error || 'Checkout failed')
        }
        setProcessing(false)
        return
      }

      setCheckoutRequestId(data.checkoutRequestId)
      setPaymentPhone(phoneNumber)
      setCurrentStep('payment')
      setPaymentStage('waiting')
      setTimeRemaining(PAYMENT_TIMEOUT_SECONDS)

      if (!data.checkoutRequestId || !data.orderId) {
        setError('Invalid checkout response')
        setProcessing(false)
        return
      }

      pollPaymentStatus(data.checkoutRequestId, data.orderId)
    } catch (err) {
      if (isNetworkError(err)) {
        setError('Unable to connect. Please check your internet connection.')
      } else {
        setError('An error occurred during checkout')
      }
      setProcessing(false)
    }
  }

  const handleSubmitShipping = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, address: true, city: true, state: true, zipCode: true })
    
    const nameError = validateField('name', shippingAddress.name)
    const addressError = validateField('address', shippingAddress.address)
    const cityError = validateField('city', shippingAddress.city)
    const stateError = validateField('state', shippingAddress.state)
    const zipCodeError = validateField('zipCode', shippingAddress.zipCode)
    const phoneValidation = validatePhone(phone.replace(/\D/g, ''))

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
    retryPayment(shippingAddress, phone.replace(/\D/g, ''))
  }

  const pollPaymentStatus = async (checkoutId: string, orderId: string) => {
    const timerInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          setError('Payment timed out. Please try again.')
          setCurrentStep('shipping')
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

      if (!orderId) {
        clearInterval(timerInterval)
        setError('Order ID missing')
        return
      }

      try {
        const res = await fetch(`/api/checkout?orderId=${orderId}`)
        const data = await res.json()

        if (data.status === 'success') {
          clearInterval(timerInterval)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          setPaymentStage('success')
          setStatusMessage('Payment confirmed! Processing your order...')
          
          const orderNum = data.order?.id || orderId
          setOrderNumber(orderNum.slice(0, 8).toUpperCase())
          setCurrentStep('confirmation')
          setCart({ items: [], total: 0 })
          return
        }

        if (data.errorCode) {
          clearInterval(timerInterval)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          setError(getMpesaErrorMessage(data.errorCode))
          setCurrentStep('shipping')
          return
        }

        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval)
            setError('Payment timed out. Please try again.')
            setCurrentStep('shipping')
            return 0
          }
          return prev
        })

        setPaymentStage('polling')
        setStatusMessage('Waiting for you to enter PIN...')
        pollIntervalRef.current = setTimeout(poll, 3000)
      } catch {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval)
            setError('Failed to verify payment. Please try again.')
            setCurrentStep('shipping')
            return 0
          }
          return prev
        })
        pollIntervalRef.current = setTimeout(poll, 3000)
      }
    }

    pollIntervalRef.current = setTimeout(poll, 3000)
  }

  const subtotal = cart.total
  const shipping = 0
  const tax = 0
  const total = subtotal + shipping + tax

  if (!user) {
    return null
  }

  if (currentStep === 'confirmation') {
    return (
      <div className="py-8">
        <div className="container-custom">
          <div className="max-w-lg mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-slate-600 mb-2">Thank you for your purchase.</p>
            <p className="text-slate-500 mb-6">
              Order Number: <span className="font-mono font-medium">{orderNumber}</span>
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <div>
                  <p className="font-medium text-green-800">Confirmation sent!</p>
                  <p className="text-sm text-green-700">
                    A confirmation has been sent to your phone.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={`/orders?success=true`} className="flex-1 btn-primary py-3 text-center">
                View Order
              </Link>
              <Link href="/products" className="flex-1 btn-secondary py-3 text-center">
                Continue Shopping
              </Link>
            </div>
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                Need help? <Link href="#" className="text-blue-600 hover:underline">Contact support</Link> with your order number {orderNumber}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusMessage = () => {
    switch (paymentStage) {
      case 'sending':
        return 'Sending payment request...'
      case 'waiting':
        return 'Payment request sent! Check your phone now'
      case 'polling':
        return 'Waiting for you to enter PIN...'
      case 'success':
        return 'Payment confirmed!'
      default:
        return statusMessage || 'Processing your payment...'
    }
  }

  if (currentStep === 'payment') {
    return (
      <div className="py-8">
        <div className="container-custom">
          <CheckoutSteps currentStep={currentStep} />
          
          <div className="max-w-lg mx-auto">
            <div className="card p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className={`w-24 h-24 bg-green-100 rounded-full flex items-center justify-center ${paymentStage === 'waiting' || paymentStage === 'polling' ? 'animate-pulse' : ''}`}>
                    <svg className="w-12 h-12 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  {(paymentStage === 'waiting' || paymentStage === 'polling') && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                    </div>
                  )}
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Check Your Phone</h2>
              <p className="text-slate-600 mb-6">{getStatusMessage()}</p>
              
              {paymentPhone && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-green-700 mb-1">Payment request sent to:</p>
                  <p className="text-2xl font-bold text-green-800">{formatPhoneForDisplay(paymentPhone)}</p>
                </div>
              )}

              <div className="bg-slate-100 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-left">
                    <p className="text-sm text-slate-500">Amount</p>
                    <p className="text-2xl font-bold text-slate-700">KES {formatPrice(total).replace('KES', '').trim()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Time remaining</p>
                    <p className="text-2xl font-bold text-green-600">{formatTime(timeRemaining)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">You have {formatTime(timeRemaining)} to complete payment on your phone</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-5 mb-6 text-left">
                <p className="font-semibold text-blue-800 mb-4 text-lg">How to pay:</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                    <div>
                      <p className="font-medium text-blue-800">Check your phone</p>
                      <p className="text-sm text-blue-600">Look for the M-Pesa payment prompt</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                    <div>
                      <p className="font-medium text-blue-800">Enter your PIN</p>
                      <p className="text-sm text-blue-600">Type your M-Pesa PIN to confirm</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                    <div>
                      <p className="font-medium text-blue-800">Wait for confirmation</p>
                      <p className="text-sm text-blue-600">We'll update automatically when done</p>
                    </div>
                  </div>
                </div>
              </div>

              {(paymentStage === 'waiting' || paymentStage === 'polling') && (
                <div className="flex items-center justify-center gap-2 mb-6 text-slate-500">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <span className="text-sm">Waiting for payment...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-left">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
                <p className="font-medium text-yellow-800 mb-2">Didn't receive the prompt?</p>
                <ul className="text-sm text-yellow-700 space-y-1 mb-3">
                  <li>• Make sure your phone is on and has signal</li>
                  <li>• Check your M-Pesa balance</li>
                  <li>• You may have insufficient funds</li>
                </ul>
                <button
                  onClick={handleRetry}
                  className="w-full py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                >
                  Try Again
                </button>
              </div>

              <button
                onClick={cancelPayment}
                className="w-full py-3 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel Payment
              </button>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Reference: {checkoutRequestId.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Need help? Contact support with the reference above
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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

  return (
    <div className="py-8">
      <div className="container-custom">
        <CheckoutSteps currentStep={currentStep} />
        
        {cartWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-yellow-700">{cartWarning}</p>
            </div>
            <button onClick={() => { setCartWarning(null); refreshCart(); }} className="text-sm text-yellow-700 underline">
              Refresh
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmitShipping} className="card p-6">
              <h2 className="text-lg font-semibold mb-6">Shipping Address</h2>

              {savedAddresses.length > 0 && !useSavedAddress && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">Saved Address</span>
                    <button
                      type="button"
                      onClick={() => setUseSavedAddress(true)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Use saved address
                    </button>
                  </div>
                  <p className="text-sm text-blue-700">
                    {savedAddresses[0].address.name}, {savedAddresses[0].address.city}
                  </p>
                </div>
              )}

              {useSavedAddress && savedAddresses.length > 0 && (
                <div className="mb-6 p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Select an address</span>
                    <button
                      type="button"
                      onClick={() => setUseSavedAddress(false)}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Enter new address
                    </button>
                  </div>
                  <div className="space-y-2">
                    {savedAddresses.map((saved, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleUseSavedAddress(saved)}
                        className="w-full text-left p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <p className="font-medium">{saved.address.name}</p>
                        <p className="text-sm text-slate-600">{saved.address.address}</p>
                        <p className="text-sm text-slate-600">{saved.address.city}, {saved.address.state} {saved.address.zipCode}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                    autoComplete="name"
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
                    autoComplete="street-address"
                    value={shippingAddress.address}
                    onChange={(e) => handleAddressChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                    className={`input-field ${touched.address && formErrors.address ? 'border-red-500' : ''}`}
                    placeholder="123 Main Street, Apt 4B"
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
                      autoComplete="address-level2"
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
                    <select
                      autoComplete="address-level1"
                      value={shippingAddress.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      onBlur={() => handleBlur('state')}
                      className={`input-field ${touched.state && formErrors.state ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select County</option>
                      {KENYA_COUNTIES.map((county) => (
                        <option key={county} value={county}>
                          {county}
                        </option>
                      ))}
                    </select>
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
                      autoComplete="postal-code"
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

                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    M-Pesa Payment
                  </h3>
                  
                  <div className="bg-green-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-700 mb-2 font-medium">How to pay with M-Pesa:</p>
                    <ol className="text-sm text-green-600 space-y-1">
                      <li>1. Enter your M-Pesa phone number below</li>
                      <li>2. Click &quot;Pay with M-Pesa&quot;</li>
                      <li>3. Check your phone for the payment prompt</li>
                      <li>4. Enter your M-Pesa PIN to confirm</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      M-Pesa Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="0712 345 678"
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
                      Format: 0712 345 678 or 254 712 345 678
                    </p>
                  </div>
                </div>
              </div>
            </form>

            <SecurityBadges />
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 h-fit lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium text-slate-700">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Items ({cart.items.reduce((sum, i) => sum + i.quantity, 0)})</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4 mb-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">{formatPrice(total)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">KES (Kenyan Shillings)</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                  <span>Estimated delivery: <strong>{getEstimatedDelivery()}</strong></span>
                </div>
              </div>

              <button
                type="submit"
                onClick={handleSubmitShipping}
                disabled={processing || !isFormValid()}
                className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed sticky bottom-4 lg:static z-10"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    Pay {formatPrice(total)} with M-Pesa
                  </>
                )}
              </button>

              <div className="bg-green-50 p-3 rounded-lg mt-4">
                <div className="flex items-center justify-center gap-2 text-xs text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Secure payment via M-Pesa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutLoading() {
  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 bg-slate-200 rounded w-48 mb-8 animate-pulse" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="card p-6">
                <div className="h-6 bg-slate-200 rounded w-32 mb-6 animate-pulse" />
                <div className="space-y-4">
                  <div className="h-10 bg-slate-200 rounded animate-pulse" />
                  <div className="h-10 bg-slate-200 rounded animate-pulse" />
                  <div className="h-10 bg-slate-200 rounded animate-pulse" />
                  <div className="h-10 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="card p-6">
                <div className="h-6 bg-slate-200 rounded w-32 mb-4 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-16 bg-slate-200 rounded animate-pulse" />
                  <div className="h-16 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="h-12 bg-slate-200 rounded mt-6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutWithParams() {
  useSearchParams()
  return <CheckoutPageContent />
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutWithParams />
    </Suspense>
  )
}
