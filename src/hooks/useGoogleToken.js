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
          error_callback: (err) => {
            reject(new Error(err.type || 'Google popup blocked or closed.'))
          }
        })
      }

      // Add a safety timeout so it never hangs forever if the browser silently blocks it
      const timeoutId = setTimeout(() => {
        reject(new Error('Google login timed out or popup was blocked by the browser.'))
      }, 15000)

      // Request token — this opens the Google popup
      clientRef.current.requestAccessToken({ prompt: '' })
      
      // Clear timeout if it resolves early (hacky but works since we can't hook into the exact resolve moment easily without modifying the callback above, but let's just leave the timeout as a fallback)
      // Actually we should clear it in the callbacks:
      const originalCallback = clientRef.current.callback;
      clientRef.current.callback = (res) => { clearTimeout(timeoutId); originalCallback(res); }
      const originalErrorCallback = clientRef.current.error_callback;
      clientRef.current.error_callback = (err) => { clearTimeout(timeoutId); originalErrorCallback(err); }

    })
  }, [])

  return { getToken }
}
