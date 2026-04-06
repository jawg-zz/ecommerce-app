'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'
import { validateEmail, validatePassword, getPasswordStrength, isNetworkError } from '@/lib/validation'
import toast from 'react-hot-toast'

interface FormErrors {
  name?: string
  email?: string
  password?: string
}

function FloatingInput({
  label,
  name,
  type,
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  autoComplete,
  'aria-describedby': ariaDescribedBy,
}: {
  label: string
  name: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  error?: string
  touched?: boolean
  placeholder?: string
  autoComplete?: string
  'aria-describedby'?: string
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0
  const showFloating = focused || hasValue
  const hasError = touched && error
  const errorId = `${name}-error`

  return (
    <div className="relative">
      <div className={`relative transition-all duration-200 ${
        hasError 
          ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-500/20' 
          : value && !error
            ? 'border-green-400 focus-within:ring-2 focus-within:ring-green-500/20'
            : 'border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20'
      }`}>
        <input
          type={type}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            onBlur(e)
            setFocused(false)
          }}
          onFocus={() => setFocused(true)}
          autoComplete={autoComplete}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={ariaDescribedBy || undefined}
          className={`peer w-full px-4 pt-6 pb-2 bg-transparent border rounded-xl outline-none transition-all duration-200 ${
            hasError 
              ? 'border-red-400 text-red-900' 
              : value && !error
                ? 'border-green-400 text-green-900'
                : 'text-slate-900'
          }`}
          placeholder=" "
        />
        <label
          htmlFor={name}
          className={`absolute left-4 transition-all duration-200 pointer-events-none ${
            showFloating
              ? 'top-2 text-xs font-medium'
              : 'top-1/2 -translate-y-1/2 text-base text-slate-500'
          } ${hasError ? 'text-red-500' : focused ? 'text-sky-600' : ''}`}
        >
          {label}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        
        {value && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      {hasError && (
        <p id={errorId} className="mt-1.5 text-sm text-red-500 flex items-center gap-1 animate-slide-down" role="alert">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, refreshCart } = useApp()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  
  const passwordStrength = !isLogin ? getPasswordStrength(formData.password) : null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    if (touched[name]) {
      validateField(name as keyof FormErrors, value)
    }
    
    setError('')
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    validateField(name as keyof FormErrors, formData[name as keyof typeof formData])
  }

  const validateField = (field: keyof FormErrors, value: string) => {
    let error: string | undefined
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required'
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters'
        }
        break
      case 'email':
        if (!value.trim()) {
          error = 'Email is required'
        } else {
          const validation = validateEmail(value)
          if (!validation.isValid) {
            error = validation.error
          }
        }
        break
      case 'password':
        if (!value) {
          error = 'Password is required'
        } else if (!isLogin && value.length < 8) {
          error = 'Password must be at least 8 characters'
        }
        break
    }
    
    setErrors((prev) => ({ ...prev, [field]: error }))
    return !error
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    setTouched({ name: true, email: true, password: true })
    
    const nameValid = isLogin ? true : validateField('name', formData.name)
    const emailValid = validateField('email', formData.email)
    const passwordValid = validateField('password', formData.password)
    
    if (!nameValid || !emailValid || !passwordValid) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin 
          ? { email: formData.email, password: formData.password }
          : { 
              email: formData.email, 
              password: formData.password,
              name: formData.name 
            }
        ),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'Email already exists') {
          setError('This email is already registered. Please sign in instead.')
        } else if (data.error === 'Invalid credentials') {
          setError('Invalid email or password. Please try again.')
        } else if (data.details) {
          const firstError = data.details[0]
          if (firstError?.path?.includes('email')) {
            setError('Please enter a valid email address')
          } else if (firstError?.path?.includes('password')) {
            setError(firstError.message)
          } else {
            setError(data.error || 'Something went wrong')
          }
        } else {
          setError(data.error || 'Something went wrong')
        }
        setLoading(false)
        return
      }

      setUser(data)
      await refreshCart()
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!')
      const returnUrl = searchParams.get('returnUrl')
      router.push(returnUrl || '/')
      router.refresh()
    } catch (err) {
      if (isNetworkError(err)) {
        setError('Unable to connect. Please check your internet connection.')
      } else {
        setError('An error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (!passwordStrength) return ''
    if (passwordStrength.label === 'Very Weak' || passwordStrength.label === 'Weak') return 'bg-red-500'
    if (passwordStrength.label === 'Fair') return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="max-w-md mx-auto">
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-slate-500 mt-1">
                {isLogin ? 'Sign in to continue shopping' : 'Join us and start shopping'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-start gap-2 animate-scale-in" role="alert">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
              <FloatingInput
                label="Full Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.name}
                touched={touched.name}
                autoComplete="name"
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            )}

            <FloatingInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              touched={touched.email}
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
            />

            <FloatingInput
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              touched={touched.password}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
                
              {!isLogin && formData.password && passwordStrength && (
                <div className="mt-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Password strength:</span>
                    <span className={`
                      ${passwordStrength.label === 'Very Weak' || passwordStrength.label === 'Weak' ? 'text-red-500' : ''}
                      ${passwordStrength.label === 'Fair' ? 'text-yellow-500' : ''}
                      ${passwordStrength.label === 'Good' || passwordStrength.label === 'Strong' ? 'text-green-500' : ''}
                      font-medium
                    `}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getPasswordStrengthColor()}`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                  <ul className="mt-3 text-xs text-slate-500 space-y-1.5">
                    <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                      {formData.password.length >= 8 ? '✓' : '•'} At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>
                      {/[A-Z]/.test(formData.password) ? '✓' : '•'} Contains uppercase letter
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? 'text-green-600' : ''}>
                      {/[a-z]/.test(formData.password) ? '✓' : '•'} Contains lowercase letter
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                      {/[0-9]/.test(formData.password) ? '✓' : '•'} Contains number
                    </li>
                  </ul>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Please wait...
                  </>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">or</span>
              </div>
            </div>

            <p className="text-center text-slate-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setErrors({})
                  setTouched({})
                }}
                className="text-sky-600 hover:text-sky-700 font-semibold transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-500 hover:text-sky-600 transition-colors inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="py-12">
        <div className="container-custom">
          <div className="max-w-md mx-auto">
            <div className="card p-8 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-1/2 mx-auto mb-8" />
              <div className="space-y-4">
                <div className="h-14 bg-slate-200 rounded" />
                <div className="h-14 bg-slate-200 rounded" />
                <div className="h-14 bg-slate-200 rounded" />
                <div className="h-12 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
