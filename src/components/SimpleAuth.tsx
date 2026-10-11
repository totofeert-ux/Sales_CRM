import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function SimpleAuth() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('test@gmail.com');
  const [password, setPassword] = useState('tototo');
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async () => {
    try {
      setLoading(true);
      
      // Sanitize and validate email
      const cleanEmail = (email ?? '')
        .trim()
        .toLowerCase()
        .replace(/\u200B/g, ''); // remove zero-width chars
      const cleanPassword = (password ?? '').trim();

      if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
        toast({
          title: 'Invalid email',
          description: 'Please use a valid email like name@example.com',
          variant: 'destructive'
        });
        return;
      }

      console.log('signUp payload →', { email: cleanEmail.length, first: cleanEmail[0], last: cleanEmail.slice(-1) });
      
      const { data, error } = await supabase.auth.signUp({ 
        email: cleanEmail, 
        password: cleanPassword 
      });
      
      if (error) {
        console.error('Supabase signUp error:', { code: error.code, message: error.message });
        
        // Handle specific error codes with helpful messages
        switch (error.code) {
          case 'signup_disabled':
          case 'email_provider_disabled':
            toast({
              title: `Sign up failed (${error.code})`,
              description: "Enable Email provider + Allow new users to sign up in Supabase.",
              variant: "destructive"
            });
            break;
          case 'email_address_not_authorized':
            toast({
              title: `Sign up failed (${error.code})`,
              description: "Email domain allow-list is ON. Add your domain or disable it.",
              variant: "destructive"
            });
            break;
          case 'invalid_email':
          case 'email_address_invalid':
            toast({
              title: `Sign up failed (${error.code})`,
              description: "Email format invalid.",
              variant: "destructive"
            });
            break;
          case 'weak_password':
          case 'password_too_short':
            toast({
              title: `Sign up failed (${error.code})`,
              description: error.message,
              variant: "destructive"
            });
            break;
          default:
            toast({
              title: `Sign up failed (${error.code ?? 'unknown'})`,
              description: error.message ?? 'An unexpected error occurred',
              variant: "destructive"
            });
        }
        return;
      }
      
      if (data.user && !data.session) {
        toast({
          title: "Check your email",
          description: "Please check your inbox to confirm your email and complete signup.",
        });
      } else if (data.user && data.session) {
        toast({
          title: "Account created successfully",
          description: "Welcome! You can now use the app."
        });
      }
    } catch (error: any) {
      console.error('Unexpected sign up error:', error);
      toast({
        title: "Error signing up",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [email, password, toast]);

  const signIn = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "Email or password is incorrect. Try signing up if you don't have an account.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }
      
      toast({
        title: "Signed in",
        description: "Welcome back!"
      });
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Get project ref for debugging
  const projectRef = typeof window !== 'undefined' 
    ? window.location.hostname.includes('supabase.co') 
      ? window.location.hostname.split('.')[0] 
      : 'local'
    : 'unknown';

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to SoloCRM</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
            {process.env.NODE_ENV !== 'production' && (
              <div className="text-xs text-muted-foreground">
                Using Supabase project: {projectRef}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="email"
                spellCheck={false}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>
            {process.env.NODE_ENV !== 'production' && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Debug email: "{String(email).split('').map(c => c.charCodeAt(0)).join(', ')}"</div>
                <details className="cursor-pointer">
                  <summary className="text-xs font-medium">Troubleshooting Checklist</summary>
                  <div className="mt-2 text-xs space-y-1 text-muted-foreground">
                    <div>• Email provider enabled in Supabase</div>
                    <div>• Allow new users to sign up enabled</div>
                    <div>• Email allow-list disabled (or domain added)</div>
                    <div>• Confirm email OFF for testing</div>
                    <div>• App URL added to Auth redirect URLs</div>
                  </div>
                </details>
              </div>
            )}
            <div className="space-y-2">
              <Button 
                onClick={isSignUp ? signUp : signIn} 
                disabled={loading} 
                className="w-full"
              >
                {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
              <Button 
                onClick={() => setIsSignUp(!isSignUp)} 
                disabled={loading} 
                variant="ghost" 
                className="w-full"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {isSignUp 
                ? 'Note: This project may have email restrictions. If signup fails, contact the admin to add your domain to the allowlist.' 
                : 'Enter your email and password to continue'
              }
            </p>
            {isSignUp && (
              <div className="text-xs text-center">
                <a 
                  href="/auth-debug" 
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Debug Auth Issues
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="font-semibold">SoloCRM</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </header>
      <div id="app-content" />
    </div>
  );
}