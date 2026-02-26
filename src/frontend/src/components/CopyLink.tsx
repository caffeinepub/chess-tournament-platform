import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CopyLinkProps {
  url: string;
  label?: string;
  className?: string;
}

export default function CopyLink({ url, label, className }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
      )}
      <div className="flex gap-2">
        <Input
          readOnly
          value={url}
          className="bg-background/50 border-border font-mono text-xs text-muted-foreground flex-1 min-w-0"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className={cn(
            "border-border shrink-0 transition-all",
            copied
              ? "border-player-active text-player-active bg-player-active/10"
              : "hover:border-gold/50 hover:text-gold"
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
