import { useState, useEffect } from 'react'
import Head from 'next/head'
import { 
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  TextInput,
  PasswordInput,
  Button,
  Table,
  Modal,
  LoadingOverlay,
  Divider,
  Notification
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import Header from '@/components/Header'
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
  const [opened, setOpened] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingMonitor, setEditingMonitor] = useState<MonitorTarget | null>(null)

  const form = useForm({
    initialValues: {
      githubToken: '',
      githubOwner: '',
      githubRepo: '',
      pageTitle: ''
    }
  })

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

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config')
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const data = await res.json()
        setConfig({
          pageConfig: data.pageConfig,
          workerConfig: data.workerConfig
        })
        form.setValues({
          githubToken: data.githubToken || '',
          githubOwner: data.githubOwner || '',
          githubRepo: data.githubRepo || '',
          pageTitle: data.pageConfig?.title || ''
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
    setLoading(true)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubToken: form.values.githubToken,
          githubOwner: form.values.githubOwner,
          githubRepo: form.values.githubRepo,
          pageConfig: { ...config.pageConfig, title: form.values.pageTitle },
          workerConfig: config.workerConfig
        })
      })
      if (!res.ok) throw new Error('Failed to update config')
      notifications.show({
        title: 'Success',
        message: 'Configuration updated successfully',
        color: 'green'
      })
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to update config',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <LoadingOverlay visible />

  return (
    <>
      <Head>
        <title>Configuration - UptimeFlare</title>
      </Head>
      
      <Header />

      <Container size="lg" py="xl">
        <Title order={1} mb="xl">Configuration</Title>

        <form onSubmit={handleSubmit}>
          <Stack spacing="xl">
            {/* GitHub Settings */}
            <Paper p="xl" shadow="sm">
              <Title order={2} mb="md">GitHub Settings</Title>
              <Stack spacing="md">
                <PasswordInput
                  label="GitHub Token"
                  placeholder="ghp_..."
                  {...form.getInputProps('githubToken')}
                />
                <Group grow>
                  <TextInput
                    label="Owner"
                    placeholder="your-username"
                    {...form.getInputProps('githubOwner')}
                  />
                  <TextInput
                    label="Repository"
                    placeholder="your-repo"
                    {...form.getInputProps('githubRepo')}
                  />
                </Group>
              </Stack>
            </Paper>

            {/* Page Settings */}
            <Paper p="xl" shadow="sm">
              <Title order={2} mb="md">Page Settings</Title>
              <TextInput
                label="Page Title"
                {...form.getInputProps('pageTitle')}
              />
            </Paper>

            {/* Monitors */}
            <Paper p="xl" shadow="sm">
              <Title order={2} mb="md">Monitors</Title>
              <Table striped highlightOnHover>
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
                      <td>{monitor.id}</td>
                      <td>{monitor.name}</td>
                      <td>{monitor.method}</td>
                      <td>
                        <Text size="sm" color="dimmed">{monitor.target}</Text>
                      </td>
                      <td>
                        <Group spacing="xs">
                          <Button
                            size="xs"
                            onClick={() => {
                              setEditingMonitor(monitor)
                              setOpened(true)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            onClick={() => {
                              // Delete logic
                            }}
                          >
                            Delete
                          </Button>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Paper>

            <Group position="apart">
              <Button
                color="green"
                onClick={() => {
                  setEditingMonitor(null)
                  setOpened(true)
                }}
              >
                Add Monitor
              </Button>
              <Button
                type="submit"
                loading={loading}
              >
                Save Configuration
              </Button>
            </Group>
          </Stack>
        </form>
      </Container>

      {/* Monitor Edit Modal */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editingMonitor ? 'Edit Monitor' : 'Add Monitor'}
      >
        {/* Monitor form would go here */}
      </Modal>
    </>
  )
}
