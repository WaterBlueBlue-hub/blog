import {
  getCardCoverBlob,
  getPublishingToken,
  publishableCardOverrides,
  type CardOverride,
} from './cardEditor'

const REPOSITORY_OWNER = 'WaterBlueBlue-hub'
const REPOSITORY_NAME = 'waterblueblue-hub.github.io'
const REPOSITORY_BRANCH = 'main'
const OVERRIDES_FILE = 'site/docs/public/card-overrides.json'
const COVER_DIRECTORY = 'site/docs/public/card-overrides'
const API_ROOT = 'https://api.github.com'

type GitHubRepository = {
  full_name: string
  permissions?: {
    admin?: boolean
    maintain?: boolean
    push?: boolean
  }
}

type GitHubFile = {
  sha: string
}

type GitHubCommitResponse = {
  commit?: {
    html_url?: string
    sha?: string
  }
}

export type PublishResult = {
  commitSha: string
  commitUrl: string
  deploymentTriggered: boolean
  overrideCount: number
  uploadedCovers: number
}

class GitHubApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function apiPath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

async function githubRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  if (!response.ok) {
    let message = `GitHub API 请求失败（${response.status}）`
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // Keep the status-based fallback when GitHub does not return JSON.
    }
    throw new GitHubApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export async function validatePublishingToken(token: string) {
  const repository = await githubRequest<GitHubRepository>(
    `/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`,
    token,
  )
  if (!repository.permissions?.push) {
    throw new Error('该密钥没有这个网站的 Contents 写入权限')
  }
  return repository.full_name
}

async function getFile(path: string, token: string) {
  try {
    return await githubRequest<GitHubFile>(
      `/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/contents/${apiPath(path)}?ref=${REPOSITORY_BRANCH}`,
      token,
    )
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) return undefined
    throw error
  }
}

async function putFile(
  path: string,
  token: string,
  content: string,
  message: string,
  sha?: string,
) {
  return githubRequest<GitHubCommitResponse>(
    `/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/contents/${apiPath(path)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content,
        branch: REPOSITORY_BRANCH,
        ...(sha ? { sha } : {}),
      }),
    },
  )
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function textToBase64(text: string) {
  return bytesToBase64(new TextEncoder().encode(text))
}

function extensionForBlob(blob: Blob) {
  return (
    {
      'image/gif': 'gif',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/avif': 'avif',
    }[blob.type] || 'bin'
  )
}

async function digestBytes(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function parseCardKey(key: string) {
  const [kind, id] = key.split(':', 2)
  if ((kind !== 'article' && kind !== 'note' && kind !== 'project') || !id) {
    return undefined
  }
  return { kind, id }
}

async function publishLocalCovers(overrides: Record<string, CardOverride>, token: string) {
  let uploadedCovers = 0

  for (const [key, override] of Object.entries(overrides)) {
    if (!override.image?.startsWith('idb://')) continue
    const parsed = parseCardKey(key)
    if (!parsed) continue

    const blob = await getCardCoverBlob(parsed.kind, parsed.id)
    if (!blob) {
      throw new Error(`卡片 ${key} 的本地封面已经丢失，请重新选择封面`)
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const hash = (await digestBytes(bytes)).slice(0, 12)
    const safeId = parsed.id.replace(/[^a-zA-Z0-9_-]/g, '-')
    const filename = `${parsed.kind}-${safeId}-${hash}.${extensionForBlob(blob)}`
    const repositoryPath = `${COVER_DIRECTORY}/${filename}`
    const existing = await getFile(repositoryPath, token)

    if (!existing) {
      await putFile(
        repositoryPath,
        token,
        bytesToBase64(bytes),
        `chore: publish ${parsed.kind} card cover`,
      )
      uploadedCovers += 1
    }

    override.image = `/card-overrides/${filename}`
  }

  return uploadedCovers
}

export async function publishCardOverrides(token = getPublishingToken()): Promise<PublishResult> {
  if (!token) throw new Error('当前浏览器尚未配置 GitHub 发布密钥')
  await validatePublishingToken(token)

  const overrides = publishableCardOverrides()
  const uploadedCovers = await publishLocalCovers(overrides, token)
  const existing = await getFile(OVERRIDES_FILE, token)
  const response = await putFile(
    OVERRIDES_FILE,
    token,
    textToBase64(`${JSON.stringify(overrides, null, 2)}\n`),
    'feat: publish card overrides',
    existing?.sha,
  )
  let deploymentTriggered = true
  try {
    await githubRequest<void>(
      `/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/actions/workflows/deploy-site.yml/dispatches`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ ref: REPOSITORY_BRANCH }),
      },
    )
  } catch {
    deploymentTriggered = false
  }

  return {
    commitSha: response.commit?.sha ?? '',
    commitUrl:
      response.commit?.html_url ??
      `https://github.com/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/commits/${REPOSITORY_BRANCH}`,
    deploymentTriggered,
    overrideCount: Object.keys(overrides).length,
    uploadedCovers,
  }
}
