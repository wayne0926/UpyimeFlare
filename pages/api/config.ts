import { NextResponse } from 'next/server'
import { Octokit } from 'octokit' 
import { pageConfig, workerConfig } from '../../uptime.config'

export const runtime = 'edge'

export async function GET() {
  try {
    if (!pageConfig || !workerConfig) {
      throw new Error('Config not loaded')
    }
    return NextResponse.json({ 
      pageConfig: {
        ...pageConfig,
        title: pageConfig.title || 'UptimeFlare Status'
      },
      workerConfig: {
        ...workerConfig,
        monitors: workerConfig.monitors || []
      }
    })
  } catch (err) {
    console.error('Config load error:', err)
    return NextResponse.json({ 
      error: 'Failed to load config',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}

interface ConfigRequestBody {
  githubToken: string
  githubOwner: string  
  githubRepo: string
  pageConfig: any
  workerConfig: any
}

export async function POST(request: Request) {
  const body = await request.json() as Partial<ConfigRequestBody>
  const { githubToken, githubOwner, githubRepo, ...newConfig } = body
  
  if (!githubToken || !githubOwner || !githubRepo) {
    return NextResponse.json({ 
      error: 'GitHub credentials required' 
    }, { status: 400 })
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('GitHub API error:', err)
    return NextResponse.json({ 
      error: 'Failed to update config on GitHub' 
    }, { status: 500 })
  }
}
