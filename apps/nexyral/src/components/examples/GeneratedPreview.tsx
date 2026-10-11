import { useMemo } from 'react';
import { previewDocument } from '../../lib/example-preview';
import type { ExampleSource } from '../../../shared/public-examples';
export default function GeneratedPreview({ source, title }: { source: ExampleSource; title: string }) {
  const document = useMemo(() => previewDocument(source), [source]);
  return <iframe className="live-preview" title={`${title} — interactive AI-generated app`} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" srcDoc={document} />;
}
