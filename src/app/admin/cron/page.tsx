'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface CronJob {
  id: string
  name: string
  description: string
  schedule: string
  lastRun?: string
  status?: 'idle' | 'running'
  result?: {
    success: boolean
    ordersCleaned?: number
    duration?: number
    error?: string
  }
}

interface HistoryEntry {
  jobName: string
  status: 'success' | 'failure'
  ordersCleaned?: number
  duration?: number
  error?: string
  timestamp: string
}

export default function CronManagementPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/cron')
      const data = await res.json()
      setJobs(data.jobs || [])
      setHistory(data.history || [])
    } catch (error) {
      console.error('Failed to fetch cron status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const handleTrigger = async (jobId: string) => {
    setTriggering(jobId)
    try {
      const res = await fetch('/api/admin/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: jobId }),
      })

      if (res.ok) {
        await fetchStatus()
      } else {
        alert('Failed to trigger job')
      }
    } catch (error) {
      console.error('Failed to trigger job:', error)
      alert('Failed to trigger job')
    } finally {
      setTriggering(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Cron Jobs</h1>
          <p className="text-slate-500 mt-2">Manage scheduled background tasks</p>
        </div>

        <div className="grid gap-6 mb-8">
          {jobs.map((job) => (
            <div key={job.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-900">{job.name}</h3>
                    {job.status === 'running' ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                        Running
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                        <div className="w-2 h-2 bg-slate-400 rounded-full" />
                        Idle
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mb-3">{job.description}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{job.schedule}</span>
                    </div>
                    {job.lastRun && (
                      <div className="flex items-center gap-1.5">
                        <span>Last run:</span>
                        <span className="font-medium text-slate-700">
                          {new Date(job.lastRun).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleTrigger(job.id)}
                  disabled={triggering === job.id || job.status === 'running'}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {triggering === job.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Now
                    </>
                  )}
                </button>
              </div>

              {job.result && (
                <div className={`mt-4 p-4 rounded-lg ${
                  job.result.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {job.result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        job.result.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {job.result.success ? 'Last run successful' : 'Last run failed'}
                      </p>
                      {job.result.success && job.result.ordersCleaned !== undefined && (
                        <p className="text-sm text-green-700 mt-1">
                          Processed {job.result.ordersCleaned} order{job.result.ordersCleaned !== 1 ? 's' : ''}
                          {job.result.duration && ` in ${job.result.duration}ms`}
                        </p>
                      )}
                      {!job.result.success && job.result.error && (
                        <p className="text-sm text-red-700 mt-1 font-mono">{job.result.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {history.slice(0, 10).map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                >
                  {entry.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{entry.jobName}</p>
                    {entry.status === 'success' && entry.ordersCleaned !== undefined && (
                      <p className="text-xs text-slate-600">
                        {entry.ordersCleaned} order{entry.ordersCleaned !== 1 ? 's' : ''} processed
                        {entry.duration && ` in ${entry.duration}ms`}
                      </p>
                    )}
                    {entry.status === 'failure' && entry.error && (
                      <p className="text-xs text-red-600 font-mono truncate">{entry.error}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
