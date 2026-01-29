import { Switch } from "@heroui/switch";
import { Tooltip } from "@heroui/tooltip";

// Define generic interface since specific SwitchProps isn't exported directly in some versions
interface PlaywrightSwitchProps {
  isSelected: boolean;
  onValueChange: (isSelected: boolean) => void;
  size?: "sm" | "md" | "lg";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  [key: string]: any;
}

const InfoIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
  </svg>
);

export default function PlaywrightSwitch({ 
  isSelected, 
  onValueChange, 
  size = "sm",
  color = "warning",
  ...props 
}: PlaywrightSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        isSelected={isSelected}
        onValueChange={onValueChange}
        size={size}
        color={color}
        {...props}
      >
        <span className="text-sm">Use Playwright</span>
      </Switch>
      <Tooltip 
        content={
          <div className="px-1 py-1 max-w-xs">
            <div className="font-bold mb-1">About Playwright</div>
            <div className="text-xs">
              Enable this if the website uses heavy JavaScript or is a Single Page Application (SPA).
              It renders pages like a real browser but is slower than the default method.
            </div>
          </div>
        }
      >
        <div className="cursor-help opacity-70 hover:opacity-100">
           <InfoIcon className="w-4 h-4" />
        </div>
      </Tooltip>
    </div>
  );
}
