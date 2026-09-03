import {
  SyncGateway,
  SyncPayload,
  SyncConnectionResult,
  RemotePullResult,
  RemotePushResult,
} from '../../domain/ports/ISyncGateway';

const GIST_FILENAME = 'nhs-wage-calculator-data.json';

const getFetch = (): typeof fetch => {
  if (typeof window !== 'undefined' && window.fetch) return window.fetch.bind(window);
  if (typeof globalThis !== 'undefined' && globalThis.fetch) return globalThis.fetch;
  return fetch;
};

export const createGithubGistSyncGateway = (customFetch?: typeof fetch): SyncGateway => {
  const fetchClient = (...args: Parameters<typeof fetch>) => {
    const fn = customFetch || getFetch();
    return fn(...args);
  };

  const testConnection = async (token: string, gistId: string): Promise<SyncConnectionResult> => {
    const trimmedToken = token.trim();
    const trimmedGistId = gistId.trim();

    if (!trimmedToken) {
      return { success: false, message: 'GitHub Personal Access Token is required.' };
    }

    try {
      if (trimmedGistId) {
        const res = await fetchClient(`https://api.github.com/gists/${trimmedGistId}`, {
          headers: {
            Authorization: `Bearer ${trimmedToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            return {
              success: false,
              message: 'Gist not found (404). Check Gist ID or token permissions.',
            };
          }
          if (res.status === 401) {
            return {
              success: false,
              message: 'Bad credentials (401). Check GitHub Personal Access Token.',
            };
          }
          return {
            success: false,
            message: `GitHub API error (${res.status}): ${res.statusText}`,
          };
        }

        return { success: true, message: 'Successfully connected to existing Gist.' };
      }

      const userRes = await fetchClient('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!userRes.ok) {
        return {
          success: false,
          message: 'Invalid GitHub Token. Please check token permissions (must have "gist" scope).',
        };
      }

      const userData = await userRes.json();
      return {
        success: true,
        message: `Token valid for user @${userData.login}. Ready to create or sync Gist.`,
      };
    } catch (e) {
      return {
        success: false,
        message: `Network error: ${e instanceof Error ? e.message : 'Failed to reach GitHub'}`,
      };
    }
  };

  const pullRemote = async (token: string, gistId: string): Promise<RemotePullResult> => {
    const trimmedToken = token.trim();
    const trimmedGistId = gistId.trim();

    if (!trimmedToken || !trimmedGistId) {
      return { success: false, notFound: true, errorMessage: 'Missing token or Gist ID' };
    }

    const res = await fetchClient(`https://api.github.com/gists/${trimmedGistId}`, {
      headers: {
        Authorization: `Bearer ${trimmedToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, notFound: true, errorMessage: 'Gist not found (404)' };
      }
      return {
        success: false,
        errorMessage: `Failed to fetch Gist (${res.status}): ${res.statusText}`,
      };
    }

    const data = await res.json();
    const file = data.files?.[GIST_FILENAME];
    if (!file || !file.content) {
      return { success: true, payload: undefined };
    }

    try {
      const parsed = JSON.parse(file.content) as SyncPayload;
      return { success: true, payload: parsed };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Malformed JSON in remote Gist: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  };

  const pushRemote = async (
    token: string,
    gistId: string,
    payload: SyncPayload
  ): Promise<RemotePushResult> => {
    const trimmedToken = token.trim();
    const trimmedGistId = gistId.trim();

    if (!trimmedToken) {
      return { success: false, errorMessage: 'GitHub Token is not configured.' };
    }

    const content = JSON.stringify(payload, null, 2);

    if (trimmedGistId) {
      const res = await fetchClient(`https://api.github.com/gists/${trimmedGistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          description: 'NHS Wage & Shift Calculator Cloud Data Store',
          files: {
            [GIST_FILENAME]: { content },
          },
        }),
      });

      if (!res.ok) {
        return {
          success: false,
          errorMessage: `Failed to update Gist (${res.status}): ${res.statusText}`,
        };
      }

      return { success: true, gistId: trimmedGistId };
    }

    // Create new secret Gist
    const createRes = await fetchClient('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${trimmedToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        description: 'NHS Wage & Shift Calculator Cloud Data Store',
        public: false,
        files: {
          [GIST_FILENAME]: { content },
        },
      }),
    });

    if (!createRes.ok) {
      return {
        success: false,
        errorMessage: `Failed to create Gist (${createRes.status}): ${createRes.statusText}`,
      };
    }

    const createdData = await createRes.json();
    return { success: true, gistId: createdData.id as string };
  };

  return {
    testConnection,
    pullRemote,
    pushRemote,
  };
};

export const githubGistSyncGateway = createGithubGistSyncGateway();
