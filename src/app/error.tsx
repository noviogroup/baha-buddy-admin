'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
      <button onClick={reset} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#18181b', color: '#fff', cursor: 'pointer' }}>
        Try again
      </button>
    </div>
  );
}
