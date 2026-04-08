'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useApp } from '@/components/Providers'
import { formatPrice } from '@/lib/utils'
import {
  validatePhone,
  getMpesaErrorMessage,
  isNetworkError,
} from '@/lib/validation'
import { KENYA_COUNTIES, ShippingAddress } from '@/types'
import toast from 'react-hot-toast'





interface FormErrors {
  email?: string
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

// Progress Indicator Component
function CheckoutProgress({ stage }: { stage: 'details' | 'waiting' | 'confirmed' }) {
  const steps = [
    { id: 'details', label: 'Enter Details', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )},
    { id: 'waiting', label: 'Waiting for Payment', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'confirmed', label: 'Confirmed', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
  ]

  const stageOrder = ['details', 'waiting', 'confirmed']
  const currentIndex = stageOrder.indexOf(stage)

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-sky-500 text-white ring-4 ring-sky-100' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? (
                    <svg className="w-5 h-5 animate-checkmark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="animate-pulse">{step.icon}</div>
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium text-center ${
                  isCurrent ? 'text-sky-600' : isCompleted ? 'text-green-600' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded ${
                  isCompleted ? 'bg-green-500' : 'bg-slate-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Enhanced Error Banner Component
function ErrorBanner({ 
  message, 
  onRetry, 
  onDismiss 
}: { 
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}) {
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 animate-slide-down">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-red-800">Payment Error</p>
          <p className="text-sm text-red-600 mt-1">{message}</p>
          <div className="flex gap-3 mt-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-sm font-medium text-red-700 hover:text-red-900 flex items-center gap-1 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Phone Input Component
function PhoneInput({
  value,
  onChange,
  error,
  isValid,
  disabled
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  isValid?: boolean
  disabled?: boolean
}) {
  return (
    <div>
      <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2">
        M-Pesa Phone Number <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0712 345 678"
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={error && value ? 'true' : undefined}
          aria-describedby={error && value ? 'phone-error' : undefined}
          className={`input-field pl-12 pr-10 h-14 text-lg ${error && value ? 'border-red-500 ring-2 ring-red-100' : ''} ${isValid ? 'border-green-500 ring-2 ring-green-100' : ''} ${disabled ? 'bg-slate-50 cursor-not-allowed' : ''}`}
        />
        {isValid && !disabled && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-scale">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {!isValid && !error && value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-600" />
          </div>
        )}
      </div>
      {error && value && (
        <p id="phone-error" className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      <p className="text-xs text-slate-500 mt-2">
        Format: 0712 345 678 or 254 712 345 678
      </p>
    </div>
  )
}

// M-Pesa Instructions Component
function MpesaInstructions() {
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 mb-6 border border-green-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <p className="font-semibold text-green-800">How to Pay with M-Pesa</p>
      </div>
      <ol className="space-y-2">
        {[
          { step: 1, text: 'Enter your M-Pesa phone number', icon: '📱' },
          { step: 2, text: 'Click "Pay with M-Pesa" button', icon: '👆' },
          { step: 3, text: 'Check your phone for the M-Pesa prompt', icon: '📲' },
          { step: 4, text: 'Enter your M-Pesa PIN to confirm', icon: '🔐' },
        ].map((item) => (
          <li key={item.step} className="flex items-center gap-3 text-sm text-green-700">
            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {item.step}
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Waiting for Payment Component
function WaitingForPayment({
  phone,
  total,
  timeRemaining,
  onResend,
  onCancel,
  processing,
  error
}: {
  phone: string
  total: number
  timeRemaining: number
  onResend: () => void
  onCancel: () => void
  processing: boolean
  error?: string
}) {
  const isUrgent = timeRemaining < 120

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center animate-pulse-slow shadow-lg shadow-green-200">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-green-800 text-lg">Waiting for M-Pesa Payment</p>
          <p className="text-green-600 text-sm">Check your phone now!</p>
        </div>
      </div>

      {/* Payment Details Card */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Payment sent to</span>
          <span className="text-sm font-medium text-slate-700">{formatPhoneForDisplay(phone)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Amount</span>
          <span className="text-xl font-bold text-sky-600">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Timer */}
      <div className={`rounded-lg p-3 mb-4 ${isUrgent ? 'bg-orange-100 border border-orange-300' : 'bg-green-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${isUrgent ? 'text-orange-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`text-sm font-medium ${isUrgent ? 'text-orange-700' : 'text-green-700'}`}>
              {isUrgent ? 'Hurry! Time running out:' : 'Time remaining:'}
            </span>
          </div>
          <span className={`font-bold ${isUrgent ? 'text-orange-700 text-lg' : 'text-green-700'}`}>
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700">
            <strong>Don&apos;t close this page.</strong> Enter your PIN on your phone when the M-Pesa prompt appears.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onResend}
          disabled={processing}
          className="flex-1 py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Resend Request
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// Accordion Section Component
function AccordionSection({
  title,
  icon,
  children,
  isOpen,
  onToggle,
  completed = false,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  completed?: boolean
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            completed ? 'bg-green-100 text-green-600' : isOpen ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'
          }`}>
            {completed ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              icon
            )}
          </div>
          <span className={`font-medium ${isOpen ? 'text-slate-900' : 'text-slate-600'}`}>{title}</span>
        </div>
        <svg 
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-slate-100">
          {children}
        </div>
      )}
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
  const [isGuestCheckout, setIsGuestCheckout] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneValid, setPhoneValid] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  // Accordion state for one-page checkout
  const [openSection, setOpenSection] = useState<'shipping' | 'payment' | 'summary'>('shipping')
  const [sectionsCompleted, setSectionsCompleted] = useState({
    shipping: false,
    payment: false,
  })

  const [phoneError, setPhoneError] = useState('')
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [useSavedAddress, setUseSavedAddress] = useState(false)
  const [cartWarning, setCartWarning] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [paymentPhone, setPaymentPhone] = useState('')
  const [paymentStage, setPaymentStage] = useState<'details' | 'waiting' | 'confirmed'>('details')
  const [orderId, setOrderId] = useState<string | undefined>(undefined)
  const [timeRemaining, setTimeRemaining] = useState(600)
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
    // Allow guest checkout - just refresh cart
    refreshCart()
  }, [refreshCart])

  useEffect(() => {
    const fetchSavedAddresses = async () => {
      // Skip for guest checkout
      if (!user) return
      try {
        const res = await fetch('/api/orders')
        if (res.ok) {
          const data = await res.json()
          const orders = data.orders || []
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

  // Cleanup payment state when not in payment mode
  useEffect(() => {
    if (paymentStage === 'waiting') return
    
    setPaymentStage('details')
    setCheckoutRequestId('')
    setStatusMessage('')
    setError('')
    setOrderId(undefined)
  }, [openSection])

  useEffect(() => {
    if (openSection !== 'payment' || paymentStage !== 'waiting' || !orderId) return
    
    let pollCount = 0
    const maxPolls = 60
    
    const pollInterval = setInterval(async () => {
      pollCount++
      
      try {
        const res = await fetch(`/api/payment-status/${orderId}`)
        if (!res.ok) {
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval)
            setError('Connection timeout. Please check your payment status.')
            setPaymentStage('details')
            setProcessing(false)
          }
          return
        }
        
        const data = await res.json()
        
        if (data.status === 'paid') {
          clearInterval(pollInterval)
          router.push(`/order-confirmation?orderId=${orderId}`)
        } else if (data.status === 'cancelled' || data.status === 'failed') {
          clearInterval(pollInterval)
          const errorMessage = data.errorCode
            ? (data.message || getMpesaErrorMessage(data.errorCode))
            : (data.message || 'Payment failed. Please try again.')
          setError(errorMessage)
          setPaymentStage('details')
          setProcessing(false)
        }
        
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          setError('Payment timed out. Please check your M-Pesa messages.')
          setPaymentStage('details')
          setProcessing(false)
        }
      } catch (err) {
        console.error('Failed to check payment status:', err)
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          setError('Connection error. Please check your payment status.')
          setPaymentStage('details')
          setProcessing(false)
        }
      }
    }, 1000)
    
    return () => clearInterval(pollInterval)
  }, [openSection, orderId, router, paymentStage])

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
    } else if (cart.items.length > 0 && !initialCartRef.current) {
      initialCartRef.current = JSON.stringify(cart.items.map(i => ({ productId: i.productId, quantity: i.quantity })))
    }
  }, [cart.items, setCart])

  useEffect(() => {
    if (paymentStage !== 'waiting') {
      setTimeRemaining(600)
      return
    }
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [paymentStage])

  useEffect(() => {
    if (cart.items.length === 0) {
      router.push('/cart')
    }
  }, [cart.items.length, router])

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
      case 'email':
        if (!value.trim()) return 'Email is required'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email'
        return undefined
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
    if (isGuestCheckout && !validateField('email', guestEmail)) return false
    const nameError = validateField('name', shippingAddress.name)
    const addressError = validateField('address', shippingAddress.address)
    const cityError = validateField('city', shippingAddress.city)
    const stateError = validateField('state', shippingAddress.state)
    const zipCodeError = validateField('zipCode', shippingAddress.zipCode)
    const phoneValidation = validatePhone(phone.replace(/\D/g, ''))

    return !nameError && !addressError && !cityError && !stateError && !zipCodeError && phoneValidation.isValid
  }, [shippingAddress, phone, isGuestCheckout, guestEmail])

  const cancelPayment = useCallback(async () => {
    cancelRef.current = true
    
    const orderId = retryDataRef.current?.orderId
    if (orderId) {
      try {
        const statusRes = await fetch(`/api/checkout?orderId=${orderId}`)
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.order?.status === 'PAID') {
            router.push(`/order-confirmation?orderId=${orderId}`)
            return
          }
        }
        
        await fetch(`/api/checkout?orderId=${orderId}`, { method: 'DELETE' })
      } catch (e) {
        console.error('Failed to cancel order:', e)
      }
    }
    
    setOpenSection('shipping')
    setError('')
    setProcessing(false)
    refreshCart()
  }, [refreshCart, router])

  const handleRetry = async () => {
    if (retryDataRef.current) {
      retryPayment(retryDataRef.current.shippingAddress, retryDataRef.current.phone)
    }
  }

  const retryPayment = async (address: ShippingAddress, phoneNumber: string) => {
    setError('')
    setProcessing(true)
    cancelRef.current = false
    setPaymentStage('details')
    setStatusMessage('Sending payment request...')

    // Move to payment screen first
    setPaymentPhone(phoneNumber)
    setOpenSection('payment')

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
        setCheckoutRequestId('')
        if (data.errorCode) {
          // Prefer actual M-Pesa ResultDesc (data.message), fall back to lookup
          setError(data.message || getMpesaErrorMessage(data.errorCode))
        } else {
          setError(data.error || 'Checkout failed')
        }
        setProcessing(false)
        setPaymentStage('details')
        if (data.orderId) {
          setOrderId(data.orderId)
          retryDataRef.current = { shippingAddress: address, phone: phoneNumber, orderId: data.orderId }
        }
        return
      }

      // Only set after success
      setCheckoutRequestId(data.checkoutRequestId)
      setPaymentStage('waiting')
      setOrderId(data.orderId)
      retryDataRef.current = { shippingAddress: address, phone: phoneNumber, orderId: data.orderId }
    } catch (err) {
      if (isNetworkError(err)) {
        setError('Unable to connect. Please check your internet connection.')
      } else {
        setError('An error occurred during checkout')
      }
      setProcessing(false)
      setPaymentStage('details')
    }
  }

  const handleSubmitShipping = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newTouched: Record<string, boolean> = { name: true, address: true, city: true, state: true, zipCode: true, phone: true }
    if (isGuestCheckout) newTouched.email = true
    
    setTouched(newTouched)
    
    const emailError = isGuestCheckout ? validateField('email', guestEmail) : undefined
    const nameError = validateField('name', shippingAddress.name)
    const addressError = validateField('address', shippingAddress.address)
    const cityError = validateField('city', shippingAddress.city)
    const stateError = validateField('state', shippingAddress.state)
    const zipCodeError = validateField('zipCode', shippingAddress.zipCode)
    const phoneValidation = validatePhone(phone.replace(/\D/g, ''))

    setFormErrors({
      email: emailError,
      name: nameError,
      address: addressError,
      city: cityError,
      state: stateError,
      zipCode: zipCodeError,
    })

    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || 'Please enter a valid phone number')
      toast.error(phoneValidation.error || 'Please enter a valid phone number')
    }

    if (emailError || nameError || addressError || cityError || stateError || zipCodeError || !phoneValidation.isValid) {
      return
    }

    retryPayment(shippingAddress, phone.replace(/\D/g, ''))
  }

  const handlePaymentTimeout = async (orderId: string) => {
    setError('Payment timed out. Please try again.')
    setOpenSection('shipping')
    
    try {
      await fetch(`/api/checkout?orderId=${orderId}`, { method: 'DELETE' })
    } catch (e) {
      console.error('Failed to cancel order:', e)
    }
    
    refreshCart()
  }

  const subtotal = cart.total
  const shipping = 0
  const tax = 0
  const total = subtotal + shipping + tax

  // Allow guest checkout - no redirect to login

  const getStatusMessage = () => {
    switch (paymentStage) {
      case 'details':
        return 'Enter your details to continue'
      case 'waiting':
        return 'Payment request sent! Check your phone now'
      case 'confirmed':
        return 'Payment confirmed!'
      default:
        return statusMessage || 'Processing your payment...'
    }
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
    <div className="py-6 md:py-8">
      <div className="container-custom">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Checkout</h1>
        
        {/* Progress Indicator */}
        <CheckoutProgress stage={paymentStage} />
        
        {cartWarning && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-yellow-700 font-medium">{cartWarning}</p>
            </div>
            <button 
              onClick={() => { setCartWarning(null); refreshCart(); }} 
              className="text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              Refresh
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmitShipping} className="card p-5 md:p-6">
              {/* Guest Checkout Option */}
              {!user && (
                <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800">Guest Checkout</p>
                      <p className="text-sm text-amber-600">No account required - just enter your email below</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email field for guest checkout */}
              {!user && (
                <div className="mb-6">
                  <label htmlFor="guest-email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guest-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    onBlur={() => { setTouched(prev => ({ ...prev, email: true })); setFormErrors(prev => ({ ...prev, email: validateField('email', guestEmail) })) }}
                    aria-invalid={touched.email && formErrors.email ? 'true' : undefined}
                    aria-describedby={touched.email && formErrors.email ? 'guest-email-error' : undefined}
                    className={`input-field h-12 ${touched.email && formErrors.email ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                    placeholder="you@example.com"
                  />
                  {touched.email && formErrors.email && (
                    <p id="guest-email-error" className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formErrors.email}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    We&apos;ll send your order confirmation here
                  </p>
                </div>
              )}

              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                Shipping Address
              </h2>

              {savedAddresses.length > 0 && !useSavedAddress && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-blue-800">Saved Address</span>
                    <button
                      type="button"
                      onClick={() => setUseSavedAddress(true)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition-colors"
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
                <div className="mb-6 p-4 border-2 border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Select an address</span>
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
                        className="w-full text-left p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
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
                <ErrorBanner 
                  message={error} 
                  onRetry={handleRetry}
                  onDismiss={() => setError('')}
                />
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={shippingAddress.name}
                    onChange={(e) => handleAddressChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    aria-invalid={touched.name && formErrors.name ? 'true' : undefined}
                    aria-describedby={touched.name && formErrors.name ? 'name-error' : undefined}
                    className={`input-field h-12 ${touched.name && formErrors.name ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                    placeholder="John Doe"
                  />
                  {touched.name && formErrors.name && (
                    <p id="name-error" className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-semibold text-slate-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="address"
                    type="text"
                    autoComplete="street-address"
                    value={shippingAddress.address}
                    onChange={(e) => handleAddressChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                    aria-invalid={touched.address && formErrors.address ? 'true' : undefined}
                    aria-describedby={touched.address && formErrors.address ? 'address-error' : undefined}
                    className={`input-field h-12 ${touched.address && formErrors.address ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                    placeholder="e.g., 123 Main Street, Westlands"
                  />
                  {touched.address && formErrors.address && (
                    <p id="address-error" className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formErrors.address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-semibold text-slate-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      autoComplete="address-level2"
                      value={shippingAddress.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      onBlur={() => handleBlur('city')}
                      aria-invalid={touched.city && formErrors.city ? 'true' : undefined}
                      aria-describedby={touched.city && formErrors.city ? 'city-error' : undefined}
                      className={`input-field h-12 ${touched.city && formErrors.city ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                      placeholder="Nairobi"
                    />
                    {touched.city && formErrors.city && (
                      <p id="city-error" className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formErrors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-semibold text-slate-700 mb-2">
                      County <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="state"
                      autoComplete="address-level1"
                      value={shippingAddress.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      onBlur={() => handleBlur('state')}
                      aria-invalid={touched.state && formErrors.state ? 'true' : undefined}
                      aria-describedby={touched.state && formErrors.state ? 'state-error' : undefined}
                      className={`input-field h-12 ${touched.state && formErrors.state ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                    >
                      <option value="">Select County</option>
                      {KENYA_COUNTIES.map((county) => (
                        <option key={county} value={county}>
                          {county}
                        </option>
                      ))}
                    </select>
                    {touched.state && formErrors.state && (
                      <p id="state-error" className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formErrors.state}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-semibold text-slate-700 mb-2">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="zipCode"
                      type="text"
                      autoComplete="postal-code"
                      value={shippingAddress.zipCode}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      onBlur={() => handleBlur('zipCode')}
                      aria-invalid={touched.zipCode && formErrors.zipCode ? 'true' : undefined}
                      aria-describedby={touched.zipCode && formErrors.zipCode ? 'zipCode-error' : undefined}
                      className={`input-field h-12 ${touched.zipCode && formErrors.zipCode ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                      placeholder="00100"
                    />
                    {touched.zipCode && formErrors.zipCode && (
                      <p id="zipCode-error" className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {formErrors.zipCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-semibold text-slate-700 mb-2">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="country"
                      value={shippingAddress.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      className="input-field h-12"
                    >
                      <option value="KE">Kenya</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                    </select>
                  </div>
                </div>

                {/* M-Pesa Payment Section */}
                <div className="border-t-2 border-slate-200 pt-6 mt-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </span>
                    M-Pesa Payment
                  </h3>
                  
                  <MpesaInstructions />

                  <PhoneInput
                    value={phone}
                    onChange={handlePhoneChange}
                    error={phoneError}
                    isValid={phoneValid}
                    disabled={processing}
                  />
                </div>
              </div>
            </form>

            {/* Waiting for Payment State */}
            {openSection === 'payment' && paymentStage === 'waiting' && (
              <WaitingForPayment
                phone={paymentPhone}
                total={total}
                timeRemaining={timeRemaining}
                onResend={handleRetry}
                onCancel={cancelPayment}
                processing={processing}
                error={error}
              />
            )}

            <SecurityBadges />
          </div>

          <div className="lg:col-span-1">
            <div className="card p-5 md:p-6 h-fit lg:sticky lg:top-24 border-2 border-sky-100 shadow-xl shadow-sky-50 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
              </div>

              <div className="space-y-3 mb-4 max-h-48 md:max-h-64 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                      {item.product.image ? (
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                          loading="lazy"
                          quality={85}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-sky-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.product.name}</p>
                      <p className="text-sm font-semibold text-slate-700">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Items ({cart.items.reduce((sum, i) => sum + i.quantity, 0)})</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Shipping</span>
                  <span className="text-green-600 font-semibold">Free</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-slate-200 pt-4 mb-4 bg-slate-50 -mx-5 md:-mx-6 px-5 md:px-6 py-4 rounded-b-xl">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-sky-600">{formatPrice(total)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">KES (Kenyan Shillings)</p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 mb-4 border border-green-200">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                  <span>Estimated delivery: <strong className="text-green-800">{getEstimatedDelivery()}</strong></span>
                </div>
              </div>

              <button
                type="submit"
                onClick={handleSubmitShipping}
                disabled={processing || !isFormValid()}
                aria-busy={processing}
                className="w-full btn-primary py-4 text-lg min-h-[56px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed sticky bottom-4 lg:static z-10 rounded-xl shadow-lg shadow-sky-200 hover:shadow-xl hover:shadow-sky-300 transition-all"
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

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl mt-4 border border-green-200">
                <div className="flex items-center justify-center gap-2 text-sm text-green-700 font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
