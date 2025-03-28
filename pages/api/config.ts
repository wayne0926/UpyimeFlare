/// <reference types="@cloudflare/workers-types" />

interface Env {
  UPTIMEFLARE_STATE: KVNamespace
}

export const runtime = 'edge'

const configHandler = {
  async fetch(request: Request, env: { UPTIMEFLARE_STATE: KVNamespace }) {
    const url = new URL(request.url)
    
    if (url.pathname !== '/api/config') {
      return new Response('Not found', { status: 404 })
    }

    switch (request.method) {
      case 'GET':
        return handleGetRequest(env)
      case 'POST':
        return handlePostRequest(request, env)
      default:
        return new Response('Method not allowed', { status: 405 })
    }
  }
}

async function handleGetRequest(env: { UPTIMEFLARE_STATE: KVNamespace }) {
  try {
    const config = await env.UPTIMEFLARE_STATE.get('config', { type: 'json' })
    if (!config) {
      return new Response(JSON.stringify({ 
        error: 'Config not found in KV'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('KV config load error:', err)
    return new Response(JSON.stringify({ 
      error: 'Failed to load config from KV',
      details: err instanceof Error ? err.message : String(err)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

interface ConfigRequestBody {
  pageConfig: any
  workerConfig: any
  githubToken?: string
  githubOwner?: string  
  githubRepo?: string
}

async function handlePostRequest(request: Request, env: { UPTIMEFLARE_STATE: KVNamespace }) {
  const body = await request.json() as ConfigRequestBody
  const { githubToken, githubOwner, githubRepo, ...newConfig } = body
  
  try {
    // Always save to KV
    await env.UPTIMEFLARE_STATE.put('config', JSON.stringify(newConfig))

    // Optionally sync to GitHub if credentials provided
    if (githubToken && githubOwner && githubRepo) {
      const Octokit = (await import('octokit')).Octokit
      const octokit = new Octokit({ auth: githubToken })

      try {
        const { data: currentFile } = await octokit.rest.repos.getContent({
          owner: githubOwner,
          repo: githubRepo,
          path: 'uptime.config.ts',
        })

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
      } catch (err) {
        console.error('GitHub sync failed:', err)
        // Continue even if GitHub sync fails since KV update succeeded
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('KV config update error:', err)
    return new Response(JSON.stringify({ 
      error: 'Failed to update config in KV',
      details: err instanceof Error ? err.message : String(err)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export default configHandler.fetch
