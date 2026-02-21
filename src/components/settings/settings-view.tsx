"use client";

import { useState, useEffect } from "react";
import { useEnvaultStore } from "@/lib/store";
import { SecurityTab } from "./security-tab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SupportView } from "@/components/support/support-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  HelpCircle,
  Trash2,
  Shield,
  Bell,
  Command,
  Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { deleteAccountAction, signOut } from "@/app/actions";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { Kbd } from "@/components/ui/kbd";
import { AppHeader } from "@/components/dashboard/app-header";

const ModKey = () => (
  <>
    <span className="non-mac-only">Ctrl</span>
    <Command className="w-3 h-3 mac-only" />
  </>
);

export default function SettingsView() {
  const router = useRouter();
  const { user, updateUser, deleteAccount, logout, projects } =
    useEnvaultStore();

  // State for navigation
  const [activeTab, setActiveTab] = useState("profile");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State for form fields
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [username, setUsername] = useState(user?.username || "");
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUsername(user.username || "");
    }
  }, [user]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);

  const handleUpdateProfile = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName,
        username,
        full_name: `${firstName} ${lastName}`.trim(),
      },
    });

    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    updateUser({
      firstName,
      lastName,
      username,
    });
    toast.success("Profile updated successfully");
  };

  const handleDeleteAccountClick = () => {
    setDeleteConfirmation("");
    setIsDeleteConfirmed(false);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAccountConfirm = async () => {
    const result = await deleteAccountAction();
    if (result?.error) {
      toast.error(result.error);
      setDeleteDialogOpen(false);
      return;
    }
    deleteAccount(); // Clear local store
    toast.success("Account deleted");
    setDeleteDialogOpen(false);
  };

  const handleCopyUserIdentifier = async () => {
    const identifier = user?.username || user?.email || "";
    try {
      await navigator.clipboard.writeText(identifier);
      toast.success("Identifier copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy identifier");
    }
  };

  const handleLogout = async () => {
    logout();
    await signOut();
  };

  // Shortcuts
  useEffect(() => {
    const tabs = ["profile", "security", "notifications", "support", "danger"];

    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent;
      const index = customEvent.detail.index;
      if (index >= 0 && index < tabs.length) {
        setActiveTab(tabs[index]);
      }
    };

    const handlePrev = () => {
      setActiveTab((prev) => {
        const idx = tabs.indexOf(prev);
        return idx > 0 ? tabs[idx - 1] : tabs[tabs.length - 1];
      });
    };

    const handleNext = () => {
      setActiveTab((prev) => {
        const idx = tabs.indexOf(prev);
        return idx < tabs.length - 1 ? tabs[idx + 1] : tabs[0];
      });
    };

    document.addEventListener("switch-tab", handleSwitch);
    document.addEventListener("prev-tab", handlePrev);
    document.addEventListener("next-tab", handleNext);

    return () => {
      document.removeEventListener("switch-tab", handleSwitch);
      document.removeEventListener("prev-tab", handlePrev);
      document.removeEventListener("next-tab", handleNext);
    };
  }, []);

  // Shortcut for saving profile
  useHotkeys(
    "mod+s",
    (e) => {
      if (activeTab === "profile") {
        e.preventDefault();
        handleUpdateProfile();
      }
    },
    { enableOnContentEditable: true, enableOnFormTags: true },
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader title="Settings" backTo="/dashboard" hideSearch />

      <main className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row gap-8 relative">
          <aside className="w-full md:w-64 space-y-2 md:sticky md:top-28 md:h-fit">
            <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <Button
                variant={activeTab === "profile" ? "secondary" : "ghost"}
                className="justify-start w-full flex items-center gap-2"
                onClick={() => setActiveTab("profile")}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
                <Kbd className="ml-auto h-5 px-1.5 text-[10px] bg-muted/50 border-0">
                  1
                </Kbd>
              </Button>
              <Button
                variant={activeTab === "security" ? "secondary" : "ghost"}
                className="justify-start w-full flex items-center gap-2"
                onClick={() => setActiveTab("security")}
              >
                <Shield className="mr-2 h-4 w-4" />
                <span>Security</span>
                <Kbd className="ml-auto h-5 px-1.5 text-[10px] bg-muted/50 border-0">
                  2
                </Kbd>
              </Button>
              <Button
                variant={activeTab === "notifications" ? "secondary" : "ghost"}
                className="justify-start w-full flex items-center gap-2"
                onClick={() => setActiveTab("notifications")}
              >
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
                <Kbd className="ml-auto h-5 px-1.5 text-[10px] bg-muted/50 border-0">
                  3
                </Kbd>
              </Button>
              <Button
                variant={activeTab === "support" ? "secondary" : "ghost"}
                className="justify-start w-full flex items-center gap-2"
                onClick={() => setActiveTab("support")}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Support</span>
                <Kbd className="ml-auto h-5 px-1.5 text-[10px] bg-muted/50 border-0">
                  4
                </Kbd>
              </Button>
              <Button
                variant={activeTab === "danger" ? "secondary" : "ghost"}
                className="justify-start w-full text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-destructive/10 flex items-center gap-2"
                onClick={() => setActiveTab("danger")}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Account</span>
                <Kbd className="ml-auto h-5 px-1.5 text-[10px] bg-muted/50 border-0">
                  5
                </Kbd>
              </Button>
            </nav>
          </aside>

          <div className="flex-1 max-w-2xl">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium">Profile information</h2>
                </div>

                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="bg-background"
                        suppressHydrationWarning
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="bg-background"
                        suppressHydrationWarning
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <Label htmlFor="email">Primary email</Label>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Primary email is used for account notifications.
                      </p>
                      <div className="relative">
                        <Input
                          id="email"
                          value={user?.email || ""}
                          disabled
                          className="bg-muted pr-10"
                          suppressHydrationWarning
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Username appears as a display name throughout the
                        dashboard.
                      </p>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-background"
                        suppressHydrationWarning
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleUpdateProfile}
                        className="px-8"
                        disabled={
                          firstName === (user?.firstName || "") &&
                          lastName === (user?.lastName || "") &&
                          username === (user?.username || "")
                        }
                      >
                        Save Changes{" "}
                        <span className="ml-2 flex items-center gap-1">
                          <Kbd className="bg-primary-foreground/20 text-primary-foreground border-0">
                            <ModKey />
                          </Kbd>
                          <Kbd className="bg-primary-foreground/20 text-primary-foreground border-0">
                            S
                          </Kbd>
                        </span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "security" && <SecurityTab user={user} />}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium">
                    Notification Preferences
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage how and when you receive notifications
                  </p>
                </div>
                <NotificationPreferences />
              </div>
            )}

            {activeTab === "support" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium">Support</h2>
                </div>
                <SupportView inDashboard={true} />
              </div>
            )}

            {activeTab === "danger" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-red-600 dark:text-red-500">
                    Danger Zone
                  </h2>
                </div>
                <Card className="border-destructive/20">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-500">
                      Delete Account
                    </CardTitle>
                    <CardDescription>
                      Permanently remove your account and all data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      This action is irreversible. All your projects,
                      environment variables, and personal data will be
                      permanently deleted.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccountClick}
                    >
                      Delete Account
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your account? This action cannot
              be undone and will permanently delete your account and all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            {projects.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md space-y-3">
                <p className="text-sm font-medium text-destructive">
                  You have {projects.length} active project
                  {projects.length === 1 ? "" : "s"}.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please consider migrating them before deletion. If you
                  proceed, they will be permanently lost.
                </p>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="confirm-delete-projects"
                    checked={isDeleteConfirmed}
                    onChange={(e) => setIsDeleteConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-destructive focus:ring-destructive"
                  />
                  <label
                    htmlFor="confirm-delete-projects"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I understand that my projects will be permanently deleted.
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="delete-confirmation"
                className="text-sm font-normal"
              >
                To confirm, type{" "}
                <span className="inline-flex items-center gap-1 font-bold">
                  &quot;{user?.username || user?.email}&quot;{" "}
                  <Copy
                    className="h-4 w-4 cursor-pointer hover:text-primary"
                    onClick={handleCopyUserIdentifier}
                  />
                </span>{" "}
                below:
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={user?.username || user?.email}
                className="bg-background"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccountConfirm}
              disabled={
                deleteConfirmation !== (user?.username || user?.email) ||
                (projects.length > 0 && !isDeleteConfirmed)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
