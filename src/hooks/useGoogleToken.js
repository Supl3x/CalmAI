import { useCallback, useRef } from 'react'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ')

/**
 * Returns a function `getToken()` that opens a Google OAuth popup
 * and resolves with a fresh access_token. No backend needed.
 * Works by using Google Identity Services (GIS) Token Client.
 */
export function useGoogleToken() {
  const clientRef = useRef(null)

  const getToken = useCallback(() => {
    return new Promise((resolve, reject) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        reject(new Error('VITE_GOOGLE_CLIENT_ID is not set in .env'))
        return
      }

      // Wait for GIS to load
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services not loaded yet. Try again in a moment.'))
        return
      }

      // Re-use existing client or create a new one
      if (!clientRef.current) {
        clientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error))
            } else {
              resolve(response.access_token)
            }
          },
        })
      }

      // Request token — this opens the Google popup
      clientRef.current.requestAccessToken({ prompt: '' })
    })
  }, [])

  return { getToken }
}
