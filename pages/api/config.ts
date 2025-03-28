import { Octokit } from 'octokit'
import { pageConfig, workerConfig } from '../../uptime.config'

export const runtime = 'edge'

const configHandler = {
  async fetch(request: Request) {
    const url = new URL(request.url)
    
    if (url.pathname !== '/api/config') {
      return new Response('Not found', { status: 404 })
    }

    switch (request.method) {
      case 'GET':
        return handleGetRequest()
      case 'POST':
        return handlePostRequest(request)
      default:
        return new Response('Method not allowed', { status: 405 })
    }
  }
}

async function handleGetRequest() {
  try {
    if (!pageConfig || !workerConfig) {
      throw new Error('Config not loaded')
    }
    return new Response(JSON.stringify({ 
      pageConfig: {
        ...pageConfig,
        title: pageConfig.title || 'UptimeFlare Status'
      },
      workerConfig: {
        ...workerConfig,
        monitors: workerConfig.monitors || []
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Config load error:', err)
    return new Response(JSON.stringify({ 
      error: 'Failed to load config',
      details: err instanceof Error ? err.message : String(err)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

interface ConfigRequestBody {
  githubToken: string
  githubOwner: string  
  githubRepo: string
  pageConfig: any
  workerConfig: any
}

async function handlePostRequest(request: Request) {
  const body = await request.json() as Partial<ConfigRequestBody>
  const { githubToken, githubOwner, githubRepo, ...newConfig } = body
  
  if (!githubToken || !githubOwner || !githubRepo) {
    return new Response(JSON.stringify({ 
      error: 'GitHub credentials required' 
    }), { status: 400 })
  }

  try {
    const octokit = new Octokit({ auth: githubToken! })

    // 1. Get current file SHA
    const { data: currentFile } = await octokit.rest.repos.getContent({
      owner: githubOwner,
      repo: githubRepo,
      path: 'uptime.config.ts',
    })

    // 2. Update file  
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: githubOwner,
      repo: githubRepo,
      path: 'uptime.config.ts',
      message: 'Update uptime configuration',
      content: Buffer.from(
        `const pageConfig = ${JSON.stringify(newConfig.pageConfig, null, 2)}\n\n` +
        `const workerConfig = ${JSON.stringify(newConfig.workerConfig, null, 2)}\n\n` +
        `export { pageConfig, workerConfig }`
      ).toString('base64'),
      sha: (currentFile as any).sha
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('GitHub API error:', err)
    return new Response(JSON.stringify({ 
      error: 'Failed to update config on GitHub' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export default configHandler
