import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/Card";

interface BrowserSlice {
  browser: string;
  label: string;
  visitors: number;
  colorVar: string;
}

const chartData: BrowserSlice[] = [
  { browser: "chrome", label: "Chrome", visitors: 275, colorVar: "var(--chart-1)" },
  { browser: "safari", label: "Safari", visitors: 200, colorVar: "var(--chart-2)" },
  { browser: "firefox", label: "Firefox", visitors: 287, colorVar: "var(--chart-3)" },
  { browser: "edge", label: "Edge", visitors: 173, colorVar: "var(--chart-4)" },
  { browser: "other", label: "Other", visitors: 190, colorVar: "var(--chart-5)" },
];

export function ChartPieDonut() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalVisitors = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.visitors, 0);
  }, []);

  const size = 260;
  const center = size / 2;
  const outerRadius = 100;
  const innerRadius = 65;

  // Calculate arc slices
  let cumulativeAngle = -Math.PI / 2; // start from top (12 o'clock)
  const slices = chartData.map((item) => {
    const angle = (item.visitors / totalVisitors) * (2 * Math.PI);
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const x1 = center + outerRadius * Math.cos(startAngle);
    const y1 = center + outerRadius * Math.sin(startAngle);
    const x2 = center + outerRadius * Math.cos(endAngle);
    const y2 = center + outerRadius * Math.sin(endAngle);

    const ix1 = center + innerRadius * Math.cos(endAngle);
    const iy1 = center + innerRadius * Math.sin(endAngle);
    const ix2 = center + innerRadius * Math.cos(startAngle);
    const iy2 = center + innerRadius * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    // SVG arc path
    const path = `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${ix1} ${iy1}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}
      Z
    `;

    return { ...item, path, startAngle, endAngle };
  });

  const activeItem = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <Card className="flex flex-col h-full shadow-xs">
      <CardHeader className="items-center pb-0 text-center">
        <CardTitle className="text-base font-semibold">Pie Chart - Donut with Text</CardTitle>
        <CardDescription className="text-sm">January - June 2024</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0 flex items-center justify-center relative">
        <div className="relative w-[260px] h-[260px] flex items-center justify-center">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full transform transition-transform duration-300"
          >
            {slices.map((slice, index) => {
              const isHovered = hoveredIndex === index;
              return (
                <path
                  key={slice.browser}
                  d={slice.path}
                  fill={slice.colorVar}
                  className="cursor-pointer transition-all duration-200 hover:opacity-90"
                  style={{
                    transformOrigin: `${center}px ${center}px`,
                    transform: isHovered ? "scale(1.04)" : "scale(1)",
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Text matching tweakcn Recharts Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
              {activeItem ? activeItem.visitors.toLocaleString() : totalVisitors.toLocaleString()}
            </span>
            <span className="text-base text-muted-foreground mt-0.5">
              {activeItem ? activeItem.label : "Visitors"}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-2 text-base pt-4">
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
