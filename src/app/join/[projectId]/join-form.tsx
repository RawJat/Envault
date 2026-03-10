"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createAccessRequest } from "@/app/invite-actions";
import { toast } from "sonner";

interface JoinFormProps {
  projectId: string;
}

export function JoinForm({ projectId }: JoinFormProps) {
  const router = useRouter();
  const [isRequesting, setIsRequesting] = React.useState(false);

  const handleRequest = async () => {
    setIsRequesting(true);
    const result = await createAccessRequest(projectId);
    if (result?.error) {
      toast.error(result.error);
      setIsRequesting(false);
      return;
    }
    router.push("/dashboard?requested=true");
  };

  return (
    <Button
      className="w-full h-11 text-base"
      onClick={handleRequest}
      disabled={isRequesting}
    >
      {isRequesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isRequesting ? "Sending Request..." : "Request Access"}
    </Button>
  );
}
