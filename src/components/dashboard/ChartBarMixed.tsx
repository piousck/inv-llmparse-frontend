import { useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/Card";

interface BrowserItem {
  browser: string;
  label: string;
  visitors: number;
  colorVar: string;
}

const chartData: BrowserItem[] = [
  { browser: "chrome", label: "Chrome", visitors: 275, colorVar: "var(--chart-1)" },
  { browser: "safari", label: "Safari", visitors: 200, colorVar: "var(--chart-2)" },
  { browser: "firefox", label: "Firefox", visitors: 187, colorVar: "var(--chart-3)" },
  { browser: "edge", label: "Edge", visitors: 173, colorVar: "var(--chart-4)" },
  { browser: "other", label: "Other", visitors: 90, colorVar: "var(--chart-5)" },
];

export function ChartBarMixed() {
  const [hoveredBrowser, setHoveredBrowser] = useState<string | null>(null);
  const maxVisitors = Math.max(...chartData.map((d) => d.visitors));

  return (
    <Card className="flex flex-col h-full shadow-xs">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Bar Chart - Mixed</CardTitle>
        <CardDescription className="text-sm">January - June 2024</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-center gap-4 py-2">
        {chartData.map((item) => {
          const pct = (item.visitors / maxVisitors) * 100;
          const isHovered = hoveredBrowser === item.browser;

          return (
            <div
              key={item.browser}
              className="flex items-center gap-3 text-sm"
              onMouseEnter={() => setHoveredBrowser(item.browser)}
              onMouseLeave={() => setHoveredBrowser(null)}
            >
              {/* Y-Axis Label */}
              <span className="w-18 text-right font-medium text-muted-foreground shrink-0 text-base">
                {item.label}
              </span>

              {/* Bar track and bar */}
              <div className="flex-1 h-8 bg-muted/40 rounded-md overflow-hidden relative flex items-center">
                <div
                  className="h-full rounded-md transition-all duration-300 flex items-center justify-end px-2.5"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.colorVar,
                    filter: isHovered ? "brightness(1.1)" : "none",
                  }}
                >
                  <span className="text-sm font-semibold text-primary-foreground select-none">
                    {item.visitors}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-base pt-4">
        <div className="flex items-center gap-2 font-medium leading-none text-foreground">
          Trending up by 5.2% this month <TrendingUp className="size-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="leading-none text-muted-foreground text-sm">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}
