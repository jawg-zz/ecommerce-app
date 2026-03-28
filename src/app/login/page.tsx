'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/components/Providers'
import { useToast } from '@/components/Toast'
import { validateEmail, validatePassword, getPasswordStrength, isNetworkError } from '@/lib/validation'

interface FormErrors {
  name?: string
  email?: string
  password?: string
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, refreshCart } = useApp()
  const { showToast } = useToast()
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

  const isFormValid = () => {
    const nameValid = isLogin ? true : validateField('name', formData.name)
    const emailValid = validateField('email', formData.email)
    const passwordValid = validateField('password', formData.password)
    
    return nameValid && emailValid && passwordValid
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
      showToast(isLogin ? 'Welcome back!' : 'Account created successfully!', 'success')
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

  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="max-w-md mx-auto">
          <div className="card p-8">
            <h1 className="text-2xl font-bold text-center mb-8">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h1>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`input-field ${touched.name && errors.name ? 'border-red-500' : ''}`}
                    placeholder="John Doe"
                  />
                  {touched.name && errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${touched.email && errors.email ? 'border-red-500' : ''}`}
                  placeholder="you@example.com"
                />
                {touched.email && errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`input-field ${touched.password && errors.password ? 'border-red-500' : ''}`}
                  placeholder="••••••••"
                />
                {touched.password && errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
                
                {!isLogin && formData.password && passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Password strength:</span>
                      <span className={`
                        ${passwordStrength.label === 'Very Weak' || passwordStrength.label === 'Weak' ? 'text-red-500' : ''}
                        ${passwordStrength.label === 'Fair' ? 'text-yellow-500' : ''}
                        ${passwordStrength.label === 'Good' || passwordStrength.label === 'Strong' ? 'text-green-500' : ''}
                      `}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.percentage}%` }}
                      />
                    </div>
                    <ul className="mt-2 text-xs text-slate-500 space-y-1">
                      {formData.password.length >= 8 && <li className="text-green-600">✓ At least 8 characters</li>}
                      {formData.password.length < 8 && <li>• At least 8 characters</li>}
                      {/[A-Z]/.test(formData.password) && <li className="text-green-600">✓ Contains uppercase letter</li>}
                      {!/[A-Z]/.test(formData.password) && <li>• Contains uppercase letter</li>}
                      {/[a-z]/.test(formData.password) && <li className="text-green-600">✓ Contains lowercase letter</li>}
                      {!/[a-z]/.test(formData.password) && <li>• Contains lowercase letter</li>}
                      {/[0-9]/.test(formData.password) && <li className="text-green-600">✓ Contains number</li>}
                      {!/[0-9]/.test(formData.password) && <li>• Contains number</li>}
                    </ul>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Please wait...
                  </>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <p className="text-center mt-6 text-slate-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setErrors({})
                  setTouched({})
                }}
                className="text-blue-500 hover:text-blue-600 font-medium"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
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
                <div className="h-10 bg-slate-200 rounded" />
                <div className="h-10 bg-slate-200 rounded" />
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
