import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Deal {
  id: string;
  client_id: string;
  status: string;
  created_at: string;
}

interface DuplicateInfo {
  id: string;
  count: number;
  deals: Deal[];
}

const ClientDealsDebug: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientId, setClientId] = useState(searchParams.get('id') || '');
  const [detectedTable, setDetectedTable] = useState<'clients' | 'contacts' | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderCount, setRenderCount] = useState(0);

  // Track render count
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    console.count('[ClientDealsDebug] component rendered');
  });

  // Update URL when clientId changes
  useEffect(() => {
    if (clientId) {
      setSearchParams({ id: clientId });
    } else {
      setSearchParams({});
    }
  }, [clientId, setSearchParams]);

  // Detect table type
  const detectTable = async (): Promise<'clients' | 'contacts'> => {
    try {
      console.log('[ClientDealsDebug] Detecting table type...');
      const { error } = await supabase.from('clients').select('id').limit(1);
      
      if (error && error.code === '42P01') {
        console.log('[ClientDealsDebug] table=contacts idType=fallback');
        return 'contacts';
      }
      
      console.log('[ClientDealsDebug] table=clients idType=primary');
      return 'clients';
    } catch (err) {
      console.log('[ClientDealsDebug] table=contacts idType=fallback (error)');
      return 'contacts';
    }
  };

  // Check if ID looks like UUID
  const isUUID = (id: string): boolean => {
    return /^[0-9a-f-]{36}$/i.test(id);
  };

  // Fetch deals for a client
  const fetchDeals = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[ClientDealsDebug] Fetching deals for ID:', id);
      
      let query = supabase.from('deals').select('id, client_id, status, created_at');
      
      if (isUUID(id)) {
        query = query.eq('client_id', id);
        console.log('[ClientDealsDebug] Using UUID filter');
      } else {
        // Treat as number - convert to string for comparison
        query = query.eq('client_id', id);
        console.log('[ClientDealsDebug] Using string filter');
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      console.log('[ClientDealsDebug] deals fetched:', data?.length || 0);
      setDeals(data || []);
      
      // Analyze duplicates
      const dealMap = new Map<string, Deal[]>();
      (data || []).forEach(deal => {
        if (!dealMap.has(deal.id)) {
          dealMap.set(deal.id, []);
        }
        dealMap.get(deal.id)!.push(deal);
      });
      
      const duplicateList: DuplicateInfo[] = [];
      dealMap.forEach((deals, id) => {
        if (deals.length > 1) {
          duplicateList.push({ id, count: deals.length, deals });
        }
      });
      
      setDuplicates(duplicateList);
      
      if (duplicateList.length > 0) {
        const duplicateIds = duplicateList.map(d => d.id);
        console.log('[ClientDealsDebug] duplicates:', duplicateIds);
      }
      
    } catch (err) {
      console.error('[ClientDealsDebug] Error fetching deals:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Run all checks
  const runChecks = async () => {
    if (!clientId.trim()) {
      setError('Please enter a client/contact ID');
      return;
    }
    
    setError(null);
    
    // Detect table
    const table = await detectTable();
    setDetectedTable(table);
    
    // Fetch deals
    await fetchDeals(clientId.trim());
  };

  // Show dev-only notice if not in development
  if (import.meta.env.MODE !== 'development') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Dev Only</h2>
              <p className="text-muted-foreground">
                This page is only available in development mode.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Client Deals Debug</h1>
          <Badge variant="outline">Dev Only</Badge>
        </div>
        
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter Client/Contact ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={runChecks} disabled={loading}>
                {loading ? 'Running...' : 'Run Checks'}
              </Button>
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {detectedTable && (
          <Card>
            <CardHeader>
              <CardTitle>Detected People Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={detectedTable === 'clients' ? 'default' : 'secondary'}>
                {detectedTable}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Deals Table */}
        {deals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Deals Fetched (Raw)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal, index) => (
                    <TableRow key={`${deal.id}-${index}`}>
                      <TableCell className="font-mono text-sm">{deal.id}</TableCell>
                      <TableCell className="font-mono text-sm">{deal.client_id}</TableCell>
                      <TableCell>{deal.status}</TableCell>
                      <TableCell>{new Date(deal.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Duplicates Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Unique vs Duplicates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{deals.length}</div>
                <div className="text-sm text-muted-foreground">Total Deals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{duplicates.length}</div>
                <div className="text-sm text-muted-foreground">Duplicate IDs</div>
              </div>
            </div>
            
            {duplicates.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Duplicate IDs:</h4>
                <div className="space-y-2">
                  {duplicates.map(dup => (
                    <div key={dup.id} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">{dup.count} copies</Badge>
                        <span className="font-mono text-sm">{dup.id}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dup.deals.map((deal, i) => (
                          <div key={i}>
                            Created: {new Date(deal.created_at).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* State & Render Logs */}
        <Card>
          <CardHeader>
            <CardTitle>State & Render Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Component Renders:</span>
                <Badge variant="outline">{renderCount}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Check browser console for detailed logs with prefix [ClientDealsDebug]
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDealsDebug;
