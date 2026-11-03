'use client';

import Script from 'next/script';
import { createElement, useEffect, useRef, useState } from 'react';

type ModelViewerElement = HTMLElement & { canActivateAR?: boolean };
type ArSupport = 'checking' | 'ready' | 'insecure' | 'in-app' | 'unsupported';

// In-app browsers (Instagram, Facebook, Snapchat, LINE, X, plain Android WebViews) usually block
// Scene Viewer intents and AR Quick Look, so guests who scan a QR code from one need a nudge.
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|Line\/|Twitter|; wv\)/i;

function platformHelp() {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'On iPhone and iPad, AR works in Safari or Chrome on iOS 12 or later.';
  if (/Android/i.test(ua)) return 'On Android, AR needs Chrome and a phone that supports Google Play Services for AR.';
  return 'Open this menu on a phone to place the dish on your table.';
}

export default function Viewer({ src, name, poster }: { src: string; name: string; poster: string }) {
  const ref = useRef<ModelViewerElement>(null);
  const [scriptError, setScriptError] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [ar, setAr] = useState<ArSupport>('checking');
  const [arFailed, setArFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // React 19 does not attach onLoad/onError to custom elements (they are reserved React events),
  // so listen to model-viewer's DOM events directly.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setModelReady(false);
    setModelError(false);
    setArFailed(false);
    const onLoad = () => {
      setModelReady(true);
      if (!window.isSecureContext) setAr('insecure');
      else if (IN_APP_BROWSER.test(navigator.userAgent)) setAr('in-app');
      else setAr(element.canActivateAR ? 'ready' : 'unsupported');
    };
    const onError = () => setModelError(true);
    const onArStatus = (event: Event) => {
      if ((event as CustomEvent<{ status: string }>).detail?.status === 'failed') setArFailed(true);
    };
    element.addEventListener('load', onLoad);
    element.addEventListener('error', onError);
    element.addEventListener('ar-status', onArStatus);
    return () => {
      element.removeEventListener('load', onLoad);
      element.removeEventListener('error', onError);
      element.removeEventListener('ar-status', onArStatus);
    };
  }, [src]);

  const model = createElement(
    'model-viewer',
    {
      ref,
      src,
      poster,
      alt: `Illustrative 3D model of ${name}`,
      ar: true,
      // WebXR first (in-page, Chrome Android), then Scene Viewer (Android app), then AR Quick Look (iOS;
      // model-viewer converts the GLB to USDZ on the device).
      'ar-modes': 'webxr scene-viewer quick-look',
      'ar-scale': 'fixed',
      'ar-placement': 'floor',
      'xr-environment': true,
      'camera-controls': true,
      'auto-rotate': reduceMotion ? undefined : true,
      'rotation-per-second': '12deg',
      'interaction-prompt': 'none',
      'shadow-intensity': '1.2',
      'shadow-softness': '0.8',
      exposure: '1.05',
      loading: 'eager',
      reveal: 'auto',
      'touch-action': 'pan-y',
      className: 'model-viewer-element',
    },
    <button slot="ar-button" className="primary ar-button">◎ View on your table</button>,
    <div slot="progress-bar" className="model-progress">Loading your dish…</div>,
  );

  const arNotice = arFailed
    ? 'AR could not start. Allow camera access, find a well-lit flat surface, and try again.'
    : ar === 'insecure' ? 'Table placement needs a secure (https) link. Ask the cafe for the menu QR code.'
    : ar === 'in-app' ? 'To place this dish on your table, open the menu in Chrome or Safari. In-app browsers block AR.'
    : ar === 'unsupported' ? `Table placement isn’t available in this browser. ${platformHelp()}`
    : '';

  return <div className="viewer">
    <Script
      id="model-viewer-library"
      src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js"
      type="module"
      strategy="afterInteractive"
      onError={() => setScriptError(true)}
    />
    {model}
    {!modelReady && !modelError && !scriptError && <div className="viewer-status"><span /> Preparing the 3D view…</div>}
    {(modelError || scriptError) && <div className="viewer-error"><strong>3D could not load.</strong><span>Check your connection, then reopen this dish. The photograph remains available above.</span></div>}
    {modelReady && arNotice && <p className="ar-notice" role="status">{arNotice}</p>}
    <span className="viewer-note">Drag to rotate · Pinch to explore</span>
  </div>;
}
