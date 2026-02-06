"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { CornerDownLeft, Delete, Command, Option as OptionIcon } from "lucide-react"

interface ShortcutHelpModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const ModKey = () => (
    <>
        <Command className="w-3 h-3 mac-only" />
        <span className="non-mac-only">Ctrl</span>
    </>
)

const AltKey = () => (
    <>
        <OptionIcon className="w-3 h-3 mac-only" />
        <span className="non-mac-only">Alt</span>
    </>
)

const CtrlKey = () => (
    <>
        <span className="mac-only">⌃</span>
        <span className="non-mac-only">Ctrl</span>
    </>
)


export function ShortcutHelpModal({ open, onOpenChange }: ShortcutHelpModalProps) {
    // Usage in shortcuts array
    const mod = <ModKey key="mod" />
    const alt = <AltKey key="alt" />


    const shortcuts = [
        {
            category: "Global",
            items: [
                { label: "Search / Command palette", keys: [mod, "K"] },
                { label: "Switch Theme", keys: ["T"] },
                { label: "Show Shortcuts", keys: ["Shift", "?"] },
                { label: "Log Out", keys: [alt, "Shift", "Q"] },
                { label: "Back to Dashboard", keys: ["Esc"] },
            ],
        },
        {
            category: "Navigation (G-Chords)",
            items: [
                { label: "Go to Dashboard", keys: ["G", "H"] },
                { label: "Go to Settings", keys: ["G", "O"] },
                { label: "Go to Notifications Page", keys: ["G", "L"] },
            ],
        },
        {
            category: "Contextual Actions",
            items: [
                { label: "Universal New / Variable", keys: ["N"] },
                { label: "Share / Access", keys: ["A"] },
                { label: "Delete", keys: [alt, "Backspace"] },
                { label: "Submit Form / Dialog", keys: [mod, <CornerDownLeft className="w-3 h-3" key="enter" />] },
            ],
        },
        {
            category: "Project & Lists",
            items: [
                { label: "Export .env", keys: [alt, "Shift", "E"] },
                { label: "Import .env", keys: [alt, "Shift", "I"] },
                { label: "Save Changes", keys: [mod, "S"] },
                { label: "Mark All Read / Clear", keys: ["M", "/", "C"] },
                { label: "Delete Selected", keys: [<Delete className="w-3 h-3" key="delete" />] },
                { label: "Switch Tabs (1-5)", keys: ["1", "-", "5"] },
            ],
        },
        {
            category: "Landing & Auth",
            items: [
                { label: "Get Started / Features", keys: ["G", "/", "F"] },
                { label: "Star / GitHub", keys: ["S", "/", "H"] },
                { label: "Auth Tabs (Login / Sign Up)", keys: ["L", "/", "U"] },
                { label: "Social Login (Google / GitHub)", keys: [alt, "G/H"] },
            ],
        },
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] overflow-y-auto md:h-auto">
                <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                    <DialogDescription>
                        Master the interface with these keyboard shortcuts.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    {shortcuts.map((section) => (
                        <div key={section.category}>
                            <h3 className="font-semibold text-muted-foreground mb-3 text-sm uppercase tracking-wider">
                                {section.category}
                            </h3>
                            <div className="space-y-3">
                                {section.items.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between text-sm">
                                        <span>{item.label}</span>
                                        <div className="flex gap-1">
                                            {item.keys.map((key, i) => (
                                                <Kbd key={i} showOnMobile={true}>{key}</Kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
