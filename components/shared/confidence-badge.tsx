import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ConfidenceLevel = "high" | "medium" | "low";

const config: Record<
  ConfidenceLevel,
  { color: string; variant: "default" | "secondary" | "outline" | "destructive"; label: string }
> = {
  high: { color: "text-green-600", variant: "secondary", label: "High confidence" },
  medium: { color: "text-yellow-600", variant: "outline", label: "Medium confidence - verify" },
  low: { color: "text-red-600", variant: "destructive", label: "Low confidence - verify" },
};

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const { variant, label } = config[level];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="text-xs px-1.5 py-0 h-5">
            {level === "high" ? "AI" : level === "medium" ? "AI?" : "AI!"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
