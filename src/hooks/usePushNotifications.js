/**
 * usePushNotifications — subscribe/unsubscribe the current browser.
 * Gracefully does nothing if VAPID public key is not configured.
 */
import { useState, useEffect } from 'react'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [supported,  setSupported]  = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [permission, setPermission] = useState('default')
  const vapidReady = !!VAPID_PUBLIC_KEY

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (!ok) return
    setPermission(Notification.permission)
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    }).catch(() => {})
  }, [])

  async function subscribe() {
    if (!supported) return
    // Without VAPID key, just request notification permission so the bell UI works
    if (!vapidReady) {
      await Notification.requestPermission()
      setPermission(Notification.permission)
      return
    }
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription: sub.toJSON() }),
      })
      setSubscribed(true)
      setPermission('granted')
    } catch (e) {
      console.warn('Push subscribe failed:', e)
    } finally { setLoading(false) }
  }

  async function unsubscribe() {
    if (!supported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      setSubscribed(false)
    } catch (e) {
      console.warn('Push unsubscribe failed:', e)
    } finally { setLoading(false) }
  }

  return { supported, subscribed, loading, permission, vapidReady, subscribe, unsubscribe }
}
