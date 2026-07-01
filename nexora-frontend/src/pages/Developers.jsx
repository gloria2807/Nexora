import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Download, Terminal } from 'lucide-react';

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Developers() {
  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs'],
    queryFn: api.getDocs,
  });

  const sdkExample = `import { v4 as uuidv4 } from 'uuid';

class NexoraClient {
  constructor(private apiKey: string, private baseUrl = 'https://api.yourdomain.com') {}

  async provisionVirtualAccount(data: { accountName: string; email: string; phone: string; bvn?: string }) {
    const response = await fetch(\`\${this.baseUrl}/api/public/v1/virtual-accounts\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        'x-idempotency-key': uuidv4()
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async transfer(data: { amount: number; destinationAccount: string; bankCode: string; narration?: string }) {
    const response = await fetch(\`\${this.baseUrl}/api/public/v1/transfers\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        'x-idempotency-key': uuidv4()
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}

// Usage
const client = new NexoraClient('your_api_key_here');
client.provisionVirtualAccount({ accountName: 'John Doe', email: 'john@example.com', phone: '08000000000' }).then(console.log);`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex gap-3">
          {/* FIX: absolute backend URLs so downloads hit port 3000, not 5173 */}
          <a
            href={`${BACKEND}/openapi.json`}
            download="nexora-openapi.json"
            className="flex items-center gap-2 bg-surface border border-border px-4 py-2 rounded-lg text-sm text-text font-medium hover:bg-border/40 transition-colors"
          >
            <Download className="w-4 h-4 text-muted" />
            OpenAPI Spec
          </a>

          <a
            href={`${BACKEND}/postman_collection.json`}
            download="nexora-postman.json"
            className="flex items-center gap-2 bg-surface border border-border px-4 py-2 rounded-lg text-sm text-text font-medium hover:bg-border/40 transition-colors"
          >
            <Download className="w-4 h-4 text-muted" />
            Postman Collection
          </a>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
          <Terminal className="w-5 h-5 text-text" />
          <h2 className="text-lg font-bold text-text tracking-tight">TypeScript SDK Example</h2>
        </div>
        <pre className="bg-matte p-4 rounded-lg overflow-x-auto text-sm font-mono text-text border border-border">
          <code>{sdkExample}</code>
        </pre>
      </div>

      <div className="bg-panel border border-border rounded-xl p-6 shadow-sm">
        {isLoading ? (
          <div className="space-y-6">
            <div className="flex gap-4 border-b border-border pb-4">
              <div className="h-6 w-24 bg-border/50 rounded animate-pulse"></div>
              <div className="h-6 w-48 bg-border/50 rounded animate-pulse"></div>
            </div>
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="h-6 w-48 bg-border/50 rounded animate-pulse"></div>
                  <div className="flex gap-4 pl-4">
                    <div className="h-6 w-16 bg-border/50 rounded animate-pulse"></div>
                    <div className="h-6 w-64 bg-border/50 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center gap-4 border-b border-border pb-6">
              <span className="bg-matte text-text px-3 py-1.5 rounded-lg text-xs font-bold font-mono shadow-sm border border-border">
                OpenAPI {docs?.openapi}
              </span>
              <span className="text-text font-bold tracking-tight">
                {docs?.info?.title}
                <span className="text-muted font-normal ml-2">v{docs?.info?.version}</span>
              </span>
            </div>

            <div className="space-y-8">
              {Object.entries(docs?.paths || {}).map(([path, methods]) => (
                <div key={path} className="space-y-4">
                  <h3 className="text-lg font-mono text-text border-l-2 border-border pl-4">{path}</h3>
                  <div className="space-y-3 pl-4">
                    {Object.entries(methods).map(([method, details]) => (
                      <div key={method} className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-lg bg-surface border border-border">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase w-16 text-center shadow-sm shrink-0 border ${
                          method === 'get' ? 'bg-border/30 text-text border-border' : 'bg-border/40 text-text border-border'
                        }`}>
                          {method}
                        </span>
                        <p className="text-sm text-muted pt-1 leading-relaxed">{details.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
