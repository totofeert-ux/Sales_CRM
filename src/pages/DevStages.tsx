import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useContacts } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { 
  DEAL_STAGES, 
  CONTACT_LIFECYCLE, 
  getDealStageOptions, 
  getContactLifecycleOptions,
  dealStageBadgeClasses,
  contactLifecycleBadgeClasses
} from "@/lib/stages";

export default function DevStages() {
  const { toast } = useToast();
  const { addContact } = useContacts();
  const { createDeal } = useDeals();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testContactCreation = async () => {
    setIsLoading(true);
    addResult("Starting contact creation tests...");
    
    try {
      // Test each lifecycle stage
      for (const stage of CONTACT_LIFECYCLE) {
        try {
          const contact = await addContact({
            companyName: `Test Company ${stage}`,
            contactName: `Test Contact ${stage}`,
            email: `test-${stage}@example.com`,
            lifecycleStage: stage,
          });
          addResult(`✅ Created contact with lifecycle: ${stage} (ID: ${contact.id})`);
        } catch (error: any) {
          addResult(`❌ Failed to create contact with lifecycle ${stage}: ${error.message}`);
        }
      }
      addResult("Contact creation tests completed");
    } catch (error: any) {
      addResult(`❌ Contact creation test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDealCreation = async () => {
    setIsLoading(true);
    addResult("Starting deal creation tests...");
    
    try {
      // First create a test contact
      const testContact = await addContact({
        companyName: "Test Deal Company",
        contactName: "Test Deal Contact",
        email: "test-deal@example.com",
        lifecycleStage: "lead",
      });
      addResult(`✅ Created test contact for deals (ID: ${testContact.id})`);

      // Test each deal stage
      for (const stage of DEAL_STAGES) {
        try {
          const deal = await createDeal({
            title: `Test Deal ${stage}`,
            clientId: testContact.id,
            amount: 10000,
            stage: stage,
            expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: `Test deal for stage ${stage}`,
          });
          addResult(`✅ Created deal with stage: ${stage} (ID: ${deal.id})`);
        } catch (error: any) {
          addResult(`❌ Failed to create deal with stage ${stage}: ${error.message}`);
        }
      }
      addResult("Deal creation tests completed");
    } catch (error: any) {
      addResult(`❌ Deal creation test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addResult("🚀 Starting comprehensive stage tests...");
    
    await testContactCreation();
    await testDealCreation();
    
    addResult("🎉 All tests completed!");
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dev Stages Test</h1>
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={isLoading}>
            {isLoading ? "Running Tests..." : "Run All Tests"}
          </Button>
          <Button onClick={clearResults} variant="outline">
            Clear Results
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deal Stages */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {DEAL_STAGES.map((stage) => (
                <Badge key={stage} className={dealStageBadgeClasses(stage)}>
                  {stage}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Total stages: {DEAL_STAGES.length}</p>
              <p>Options: {getDealStageOptions().length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Lifecycle */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {CONTACT_LIFECYCLE.map((stage) => (
                <Badge key={stage} className={contactLifecycleBadgeClasses(stage)}>
                  {stage}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Total stages: {CONTACT_LIFECYCLE.length}</p>
              <p>Options: {getContactLifecycleOptions().length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground">No tests run yet. Click "Run All Tests" to start.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

