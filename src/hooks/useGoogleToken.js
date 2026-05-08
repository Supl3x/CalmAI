import { useCallback } from 'react'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ')

/**
 * Opens GIS OAuth and resolves with a short-lived access_token.
 * Creates a fresh token client per call so callbacks stay correct (reusing one client broke repeat clicks).
 */
export function useGoogleToken() {
  const getToken = useCallback(() => {
    return new Promise((resolve, reject) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        reject(new Error('VITE_GOOGLE_CLIENT_ID is not set in .env'))
        return
      }

      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services not loaded yet. Refresh the page and try again.'))
        return
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Google login timed out or popup was blocked by the browser.'))
      }, 15000)

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
          clearTimeout(timeoutId)
          if (response.error) {
            reject(new Error(response.error))
            return
          }
          resolve(response.access_token)
        },
        error_callback: (err) => {
          clearTimeout(timeoutId)
          reject(new Error(err.type || err.message || 'Google popup blocked or closed.'))
        },
      })

      client.requestAccessToken({ prompt: '' })
    })
  }, [])

  return { getToken }
}
