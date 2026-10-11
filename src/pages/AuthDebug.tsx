import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function AuthDebug() {
  const [envCheck, setEnvCheck] = useState<{
    hasUrl: boolean;
    hasKey: boolean;
    projectRef: string;
    urlMasked: string;
  }>({ hasUrl: false, hasKey: false, projectRef: 'unknown', urlMasked: '' });
  
  const [dbCheck, setDbCheck] = useState<{
    status: 'pending' | 'success' | 'error';
    message: string;
  }>({ status: 'pending', message: 'Testing...' });

  const [authCheck, setAuthCheck] = useState<{
    status: 'pending' | 'success' | 'error';
    message: string;
  }>({ status: 'pending', message: 'Testing...' });

  useEffect(() => {
    // Parse project info from environment or current URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? 'unknown';
    const urlMasked = supabaseUrl ? `...${supabaseUrl.slice(-8)}` : 'missing';
    
    setEnvCheck({
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      projectRef,
      urlMasked
    });

    // Test database connectivity
    const testDb = async () => {
      try {
        const { data, error } = await supabase.from('clients').select('id').limit(1);
        if (error) {
          setDbCheck({
            status: 'error',
            message: `DB Error: ${error.message}`
          });
        } else {
          setDbCheck({
            status: 'success',
            message: 'Database connection successful'
          });
        }
      } catch (err: any) {
        setDbCheck({
          status: 'error',
          message: `DB Connection failed: ${err.message}`
        });
      }
    };

    // Test auth service
    const testAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setAuthCheck({
            status: 'error',
            message: `Auth Error: ${error.message}`
          });
        } else {
          setAuthCheck({
            status: 'success',
            message: 'Auth service accessible'
          });
        }
      } catch (err: any) {
        setAuthCheck({
          status: 'error',
          message: `Auth failed: ${err.message}`
        });
      }
    };

    testDb();
    testAuth();
  }, []);

  const testSignUp = async () => {
    try {
      const testEmail = `test-${Date.now()}@example.com`;
      const cleanEmail = (testEmail ?? '')
        .trim()
        .toLowerCase()
        .replace(/\u200B/g, '');
      
      console.log('Test signUp payload →', { email: cleanEmail.length, first: cleanEmail[0], last: cleanEmail.slice(-1) });
      
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: 'test123456'
      });
      
      console.log('Test sign up result:', { data, error });
      
      if (error) {
        alert(`Sign up error: ${error.message} (Code: ${error.code})`);
      } else {
        alert('Test sign up successful! Check console for details.');
      }
    } catch (err: any) {
      console.error('Test sign up failed:', err);
      alert(`Test failed: ${err.message}`);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Auth Debug Panel</h1>
          <Badge variant="outline">Development Only</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Environment Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {envCheck.hasUrl ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>Env URL (masked): {envCheck.urlMasked}</span>
              </div>
              <div className="flex items-center gap-2">
                {envCheck.hasKey ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>Anon key present: {envCheck.hasKey ? '✅' : '❌'}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Project ref: <code className="bg-muted px-1 rounded">{envCheck.projectRef}</code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Connectivity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusIcon status={dbCheck.status} />
                <span>{dbCheck.message}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={authCheck.status} />
                <span>{authCheck.message}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Auth Testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Test the sign-up flow with a random email. Check console for detailed logs including payload sanitization.
            </p>
            <Button onClick={testSignUp}>
              Test Sign Up Flow
            </Button>
            
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Supabase Settings Checklist:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Authentication → Providers → Email → Enabled ✅</li>
                <li>• Authentication → Providers (User Signups) → Allow new users to sign up ✅</li>
                <li>• Email allow-list → Disabled ✅ (or add your domain)</li>
                <li>• (Optional for MVP) Confirm email → OFF</li>
                <li>• Auth → URL Configuration: add your Lovable app URL to Redirects</li>
                <li>• Project Settings → API → Allowed Origins (CORS): add the same URL</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}