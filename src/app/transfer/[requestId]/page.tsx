import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRightLeft, Lock, XCircle } from "lucide-react";
import { TransferRequestActions } from "./transfer-request-actions";

interface TransferRequestPageProps {
  params: Promise<{ requestId: string }>;
}

type TransferRequestRow = {
  id: string;
  project_id: string;
  target_user_id: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expires_at: string;
  projects?: {
    name?: string;
  } | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function TransferRequestPage({
  params,
}: TransferRequestPageProps) {
  const { requestId } = await params;

  if (!isUuid(requestId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/transfer/${requestId}`);
  }

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("project_transfer_requests")
    .select("id, project_id, target_user_id, status, expires_at, projects(name)")
    .eq("id", requestId)
    .maybeSingle();

  const transferRequest = request as TransferRequestRow | null;

  if (!transferRequest) {
    return (
      <AuthLayout>
        <div className="w-[90vw] sm:w-full sm:max-w-md mx-auto">
          <Card className="border-muted/40 shadow-2xl backdrop-blur-sm bg-background/80">
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Request Unavailable
              </CardTitle>
              <CardDescription>
                This ownership transfer request may have been completed,
                rejected, expired, or removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full h-11" variant="outline">
                <Link href="/dashboard">
                  Return to Dashboard
                </Link>
              </Button>
            </CardContent>
            <CardFooter className="justify-center text-xs text-muted-foreground">
              <Lock className="w-3 h-3 mr-1" />
              End-to-end encrypted environment
            </CardFooter>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  if (transferRequest.target_user_id !== user.id) {
    return (
      <AuthLayout>
        <div className="w-[90vw] sm:w-full sm:max-w-md mx-auto">
          <Card className="border-muted/40 shadow-2xl backdrop-blur-sm bg-background/80">
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Not Authorized
              </CardTitle>
              <CardDescription>
                You are not the recipient of this ownership transfer request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full h-11" variant="outline">
                <Link href="/dashboard">
                  Return to Dashboard
                </Link>
              </Button>
            </CardContent>
            <CardFooter className="justify-center text-xs text-muted-foreground">
              <Lock className="w-3 h-3 mr-1" />
              End-to-end encrypted environment
            </CardFooter>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  const projectName = transferRequest.projects?.name || "Project";
  const isActionable = transferRequest.status === "pending";

  return (
    <AuthLayout>
      <div className="w-[90vw] sm:w-full sm:max-w-md mx-auto">
        <Card className="border-muted/40 shadow-2xl backdrop-blur-sm bg-background/80">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <ArrowRightLeft className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Ownership Transfer Request
            </CardTitle>
            <CardDescription>
              You were requested to become the owner of{" "}
              <span className="font-medium text-foreground">{projectName}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              Expires at: {new Date(transferRequest.expires_at).toLocaleString()}
            </p>

            {isActionable ? (
              <div className="w-full">
                <TransferRequestActions
                  requestId={transferRequest.id}
                  projectId={transferRequest.project_id}
                  projectName={projectName}
                />
              </div>
            ) : (
              <Alert>
                <AlertTitle>Request Not Actionable</AlertTitle>
                <AlertDescription>
                  This request is currently marked as{" "}
                  <strong>{transferRequest.status}</strong>.
                </AlertDescription>
              </Alert>
            )}

            <Button variant="ghost" asChild className="w-full h-11">
              <Link href="/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
          <CardFooter className="justify-center text-xs text-muted-foreground">
            <Lock className="w-3 h-3 mr-1" />
            End-to-end encrypted environment
          </CardFooter>
        </Card>
      </div>
    </AuthLayout>
  );
}
