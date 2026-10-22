'use client';

import Script from 'next/script';
import { createElement, useState } from 'react';

export default function Viewer({ src, name, poster }: { src: string; name: string; poster: string }) {
  const [scriptError, setScriptError] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  const model = createElement(
    'model-viewer',
    {
      src,
      poster,
      alt: `Illustrative 3D model of ${name}`,
      ar: true,
      'ar-modes': 'webxr scene-viewer quick-look',
      'ar-scale': 'fixed',
      'camera-controls': true,
      'auto-rotate': true,
      'rotation-per-second': '12deg',
      'shadow-intensity': '1.2',
      'shadow-softness': '0.8',
      exposure: '1.05',
      loading: 'eager',
      reveal: 'auto',
      'touch-action': 'pan-y',
      onLoad: () => setModelReady(true),
      onError: () => setModelError(true),
      className: 'model-viewer-element',
    },
    <button slot="ar-button" className="primary ar-button">◎ View on your table</button>,
    <div slot="progress-bar" className="model-progress">Loading your dish…</div>,
  );

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
    <span className="viewer-note">Drag to rotate · Pinch to explore</span>
  </div>;
}
