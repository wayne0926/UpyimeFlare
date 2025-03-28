import type { NextApiRequest, NextApiResponse } from 'next'
import { Octokit } from '@octokit/rest'
import { pageConfig, workerConfig } from '../../uptime.config'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET - Return current config
  if (req.method === 'GET') {
    try {
      return res.status(200).json({ 
        pageConfig,
        workerConfig 
      })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load config' })
    }
  }

  // POST - Update config on GitHub
  if (req.method === 'POST') {
    const { githubToken, githubOwner, githubRepo, ...newConfig } = req.body
    if (!githubToken || !githubOwner || !githubRepo) {
      return res.status(400).json({ 
        error: 'GitHub credentials required' 
      })
    }

    try {
      const octokit = new Octokit({ auth: githubToken })
      const newConfig = req.body

      // 1. Get current file SHA
      const { data: currentFile } = await octokit.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path: 'uptime.config.ts',
      })

      // 2. Update file
      await octokit.repos.createOrUpdateFileContents({
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

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('GitHub API error:', err)
      return res.status(500).json({ 
        error: 'Failed to update config on GitHub' 
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
