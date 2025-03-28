import { useState, useEffect } from 'react'
import Head from 'next/head'
import { Text, Title, Container, Button, TextInput, Table } from '@mantine/core'
import type { MonitorTarget } from '../uptime.types'
import Header from '../components/Header'

interface PageConfig {
  title: string
  links: Array<{
    link: string
    label: string
    highlight?: boolean
  }>
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
}

export default function ConfigPage() {
  const [config, setConfig] = useState<{
    pageConfig: PageConfig
    workerConfig: WorkerConfig
  }>({
    pageConfig: { title: '', links: [] },
    workerConfig: { 
      kvWriteCooldownMinutes: 5,
      monitors: [],
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config')
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const data = await res.json()
        setConfig(data)
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
        body: JSON.stringify(config)
      })
      if (!res.ok) throw new Error('Failed to update config')
      alert('Configuration saved to KV storage successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config')
    }
  }

  if (isLoading) return <Text>Loading configuration...</Text>
  if (error) return <Text color="red">Error: {error}</Text>

  return (
    <>
      <Head>
        <title>Configuration - UptimeFlare</title>
      </Head>
      
      <Header />
      
      <Container size="lg" py="md">
        <Title order={1} mb="xl">Configuration</Title>

        <form onSubmit={handleSubmit}>
          {/* Page Settings */}
          <Title order={2} mb="md">Page Settings</Title>
          <TextInput
            label="Page Title"
            value={config.pageConfig.title}
            onChange={(e) => setConfig({
              ...config,
              pageConfig: { ...config.pageConfig, title: e.target.value }
            })}
            mb="md"
          />

          {/* Monitors */}
          <Title order={2} mb="md">Monitors</Title>
          <Table striped>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {config.workerConfig.monitors?.map((monitor) => (
                <tr key={monitor.id}>
                  <td>{monitor.id}</td>
                  <td>{monitor.name}</td>
                  <td>{monitor.method}</td>
                  <td>
                    <Text component="code" size="sm">{monitor.target}</Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Button type="submit" mt="xl" size="lg">
            Save Configuration
          </Button>
        </form>
      </Container>
    </>
  )
}
