export function RegMark({ position = "top-left" }: { position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
    const positionStyles = {
        "top-left": "top-8 left-8",
        "top-right": "top-8 right-8",
        "bottom-left": "bottom-8 left-8",
        "bottom-right": "bottom-8 right-8"
    }

    return (
        <div className={`absolute ${positionStyles[position]} w-6 h-6 pointer-events-none opacity-30`}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0V24M0 12H24" stroke="currentColor" strokeWidth="1" />
            </svg>
        </div>
    )
}
