import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default:
                    "rounded-full bg-primary text-primary-foreground shadow-whisper hover:bg-g700 active:scale-[0.98] px-3",
                destructive:
                    "rounded-md bg-destructive text-destructive-foreground shadow-whisper hover:bg-destructive/90",
                outline:
                    "rounded-md border border-input bg-card text-card-foreground shadow-whisper hover:bg-accent hover:text-accent-foreground px-3",
                secondary:
                    "rounded-md bg-secondary text-secondary-foreground shadow-whisper hover:bg-secondary/80",
                ghost: "rounded-md hover:bg-accent hover:text-accent-foreground",
                link: "text-link underline-offset-4 hover:underline rounded-none px-0 h-auto",
            },
            size: {
                default: "h-9 px-3 py-2",
                sm: "h-8 rounded-md px-3 text-sm",
                lg: "h-11 rounded-full px-6 text-base",
                icon: "h-9 w-9 rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size }), className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
