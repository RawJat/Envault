'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false, // We render manually
      theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    });
  }, [resolvedTheme]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        setError('Failed to render diagram');
      }
    };

    renderChart();
  }, [chart, resolvedTheme]);

  if (error) {
    return (
      <div className="p-4 border border-red-500 rounded text-red-500 text-sm bg-red-50 dark:bg-red-900/10">
        {error}
        <pre className="mt-2 text-xs opacity-75 overflow-auto">{chart}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={ref} 
      className="mermaid flex justify-center my-4 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}
