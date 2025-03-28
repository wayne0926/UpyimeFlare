import { useState, useEffect } from 'react'
import Head from 'next/head'
import type { MonitorTarget } from '../uptime.types'

interface PageConfig {
  title: string
  links: Array<{
    link: string
    label: string
    highlight?: boolean
  }>
  group?: Record<string, string[]>
}

interface WorkerConfig {
  kvWriteCooldownMinutes: number
  monitors: MonitorTarget[]
  notification?: {
    appriseApiServer?: string
    recipientUrl?: string
    timeZone?: string
    gracePeriod?: number
  }
  callbacks: {
    onStatusChange: (
      env: any,
      monitor: MonitorTarget,
      isUp: boolean,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => Promise<void>
    onIncident: (
      env: any,
      monitor: MonitorTarget,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => Promise<void>
  }
}

export default function ConfigPage() {
  const [config, setConfig] = useState<{
    pageConfig: Partial<PageConfig>
    workerConfig: Partial<WorkerConfig>
  }>({
    pageConfig: { title: '', links: [] },
    workerConfig: { 
      monitors: [], 
      callbacks: {
        onStatusChange: async () => {},
        onIncident: async () => {}
      }
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [githubConfig, setGitHubConfig] = useState({
    githubToken: '',
    githubOwner: '',
    githubRepo: ''
  })

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config')
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const data: {
          pageConfig: PageConfig
          workerConfig: WorkerConfig
        } = await res.json()
        setConfig({
          pageConfig: data.pageConfig,
          workerConfig: data.workerConfig
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubToken: githubConfig.githubToken,
          githubOwner: githubConfig.githubOwner, 
          githubRepo: githubConfig.githubRepo,
          pageConfig: config.pageConfig,
          workerConfig: config.workerConfig
        })
      })
      if (!res.ok) throw new Error('Failed to update config')
      alert('Configuration updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config')
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <>
      <Head>
        <title>Configuration - UptimeFlare</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Configuration</h1>
        
        <form onSubmit={handleSubmit}>
          {/* GitHub Config Section */}
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">GitHub Settings</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block mb-2">GitHub Token</label>
                <input
                  type="password"
                  className="w-full p-2 border rounded"
                  aria-label="GitHub token input"
                  placeholder="ghp_..."
                  value={githubConfig.githubToken}
                  onChange={(e) => setGitHubConfig({
                    ...githubConfig,
                    githubToken: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">Owner</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  aria-label="GitHub owner input"
                  placeholder="your-username"
                  value={githubConfig.githubOwner}
                  onChange={(e) => setGitHubConfig({
                    ...githubConfig,
                    githubOwner: e.target.value
                  })}
                />
                </div>
                <div>
                  <label className="block mb-2">Repository</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                  aria-label="GitHub repo input"
                  placeholder="your-repo"
                  value={githubConfig.githubRepo}
                  onChange={(e) => setGitHubConfig({
                    ...githubConfig,
                    githubRepo: e.target.value
                  })}
                />
                </div>
              </div>
            </div>
          </div>

          {/* Basic Config Section */}
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Page Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Page Title</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  aria-label="Page title input"
                  value={config.pageConfig.title || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    pageConfig: { ...config.pageConfig, title: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Monitors Section */}
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Monitors</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {config.workerConfig.monitors?.map((monitor) => (
                    <tr key={monitor.id}>
                      <td className="p-2 border">{monitor.id}</td>
                      <td className="p-2 border">{monitor.name}</td>
                      <td className="p-2 border">{monitor.method}</td>
                      <td className="p-2 border">
                        <code className="text-sm">{monitor.target}</code>
                      </td>
                      <td className="p-2 border">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                            onClick={() => {/* Edit logic */}}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                            onClick={() => {/* Delete logic */}}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={() => {/* Add new monitor */}}
            >
              Add Monitor
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
