"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { startRegistration } from "@simplewebauthn/browser";
import {
  KeyRound,
  Fingerprint,
  Trash2,
  Loader2,
  Calendar,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useEnvaultStore } from "@/lib/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Passkey {
  id: string;
  name: string;
  credential_id: string;
  created_at: string;
  last_used_at: string;
}

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const supabase = createClient();
  const { user } = useEnvaultStore();

  useEffect(() => {
    const fetchPasskeys = async () => {
      if (!user?.id) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("passkeys")
        .select("id, name, credential_id, created_at, last_used_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load passkeys");
      } else {
        setPasskeys(data || []);
      }
      setLoading(false);
    };

    fetchPasskeys();
  }, [supabase, user?.id]);

  // Helper for refetching after modifications
  const refetchPasskeys = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("passkeys")
      .select("id, name, credential_id, created_at, last_used_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPasskeys(data || []);
  };

  const handleAddPasskey = async () => {
    try {
      setRegistering(true);

      // 1. Get registration options from server
      const resp = await fetch("/api/auth/webauthn/register/options");
      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || "Failed to get registration options");
      }
      const options = await resp.json();

      // 2. Pass options to browser authenticator via SimpleWebAuthn
      const attResp = await startRegistration({ optionsJSON: options });

      // 3. Send response back to server for verification
      const verifyResp = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attResp),
      });

      const verification = await verifyResp.json();
      if (verifyResp.ok && verification.success) {
        toast.success("Passkey added successfully");
        refetchPasskeys();
      } else {
        throw new Error(verification.error || "Verification failed");
      }
    } catch (error: Error | unknown) {
      console.error("Passkey registration error:", error);

      if (error instanceof Error && error.name === "NotAllowedError") {
        toast.error("Passkey registration cancelled");
      } else if (error instanceof Error && error.name === "InvalidStateError") {
        toast.info("This device is already registered as a passkey.");
        return;
      } else {
        toast.error(
          error instanceof Error ? error.message : "Failed to register passkey",
        );
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    const { error } = await supabase.from("passkeys").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete passkey");
    } else {
      toast.success("Passkey deleted");
      refetchPasskeys();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>
            Use passkeys for secure, passwordless sign-in across your devices.
          </CardDescription>
        </div>
        <Button onClick={handleAddPasskey} disabled={registering} size="sm">
          {registering ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Fingerprint className="mr-2 h-4 w-4" />
          )}
          Add Passkey
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground pt-4">
            Loading passkeys...
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-sm text-muted-foreground pt-4">
            No passkeys registered yet.
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card gap-3"
              >
                <div className="p-2 bg-secondary rounded-full shrink-0">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 mr-2">
                  <span className="font-medium truncate block">
                    {pk.name || "Passkey"}
                  </span>
                  <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-2 md:items-center overflow-hidden">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Added{" "}
                          {formatDistanceToNow(new Date(pk.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="hidden md:block w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Last used{" "}
                          {pk.last_used_at
                            ? formatDistanceToNow(new Date(pk.last_used_at), {
                                addSuffix: true,
                              })
                            : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Passkey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this passkey? You
                        won&apos;t be able to use it to sign in anymore.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeletePasskey(pk.id)}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        Delete Passkey
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
