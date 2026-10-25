import React, { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";

interface DataPoint {
  date: string;
  desktop: number;
  mobile: number;
}

// 90 days of sample data matching tweakcn structure
const generateData = (): DataPoint[] => {
  const result: DataPoint[] = [];
  const baseDate = new Date("2024-06-30");
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    // Create authentic peaks and valleys
    const wave = Math.sin(i * 0.2) * 120 + Math.cos(i * 0.5) * 80;
    const desktop = Math.round(Math.max(80, 320 + wave + (i % 7 === 0 ? 90 : -40)));
    const mobile = Math.round(Math.max(60, 240 + wave * 0.7 + (i % 5 === 0 ? 70 : -30)));
    result.push({ date: dateStr, desktop, mobile });
  }
  return result;
};

const fullData = generateData();

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = useState<"90d" | "30d" | "7d">("30d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const filteredData = useMemo(() => {
    const days = timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7;
    return fullData.slice(-days);
  }, [timeRange]);

  const maxVal = useMemo(() => {
    return Math.max(...filteredData.map((d) => d.desktop + d.mobile)) * 1.15 || 800;
  }, [filteredData]);

  // SVG dimensions
  const width = 1000;
  const height = 250;
  const paddingX = 20;
  const paddingY = 20;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  // Calculate coordinates
  const points = useMemo(() => {
    return filteredData.map((d, index) => {
      const x = paddingX + (index / (filteredData.length - 1)) * plotWidth;
      const totalY = paddingY + plotHeight - ((d.desktop + d.mobile) / maxVal) * plotHeight;
      const mobileY = paddingY + plotHeight - (d.mobile / maxVal) * plotHeight;
      return { x, totalY, mobileY, d };
    });
  }, [filteredData, maxVal, plotHeight, plotWidth]);

  // Generate smooth cubic bezier SVG path
  const makePath = (coords: { x: number; y: number }[], closeToBottom = false) => {
    if (coords.length === 0) return "";
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    if (closeToBottom) {
      const bottomY = paddingY + plotHeight;
      path += ` L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;
    }
    return path;
  };

  const desktopCoords = points.map((p) => ({ x: p.x, y: p.totalY }));
  const mobileCoords = points.map((p) => ({ x: p.x, y: p.mobileY }));

  const desktopAreaPath = makePath(desktopCoords, true);
  const mobileAreaPath = makePath(mobileCoords, true);
  const desktopLinePath = makePath(desktopCoords, false);
  const mobileLinePath = makePath(mobileCoords, false);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relativeX = (clientX / rect.width) * width;
    const clampedX = Math.max(paddingX, Math.min(width - paddingX, relativeX));
    const ratio = (clampedX - paddingX) / plotWidth;
    const index = Math.round(ratio * (filteredData.length - 1));
    setHoverIndex(index);
  };

  const hovered = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <Card className="@container/card">
      <CardHeader className="relative flex flex-col md:flex-row md:items-center md:justify-between p-6 pb-2 gap-3">
        <div>
          <CardTitle className="text-base font-semibold">Total Visitors</CardTitle>
          <CardDescription className="text-sm mt-1">
            <span className="hidden sm:inline">Total for the last {timeRange === "90d" ? "3 months" : timeRange === "30d" ? "30 days" : "7 days"}</span>
            <span className="sm:hidden">Last {timeRange}</span>
          </CardDescription>
        </div>

        {/* Time range toggle pills */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/80 self-start md:self-auto">
          <button
            onClick={() => setTimeRange("90d")}
            className={`h-8 px-3.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
              timeRange === "90d"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 3 months
          </button>
          <button
            onClick={() => setTimeRange("30d")}
            className={`h-8 px-3.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
              timeRange === "30d"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 30 days
          </button>
          <button
            onClick={() => setTimeRange("7d")}
            className={`h-8 px-3.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
              timeRange === "7d"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 7 days
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-6 pt-4 pb-6">
        <div className="relative aspect-auto h-[250px] w-full select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* Desktop Gradient using tweakcn chart-1 */}
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity="0.8" />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity="0.05" />
              </linearGradient>
              {/* Mobile Gradient using tweakcn chart-2 */}
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity="0.8" />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingY + plotHeight * (1 - ratio);
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeOpacity="0.5"
                />
              );
            })}

            {/* Mobile Area (Stacked under) */}
            <path d={mobileAreaPath} fill="url(#fillMobile)" />
            <path d={mobileLinePath} fill="none" stroke="var(--chart-2)" strokeWidth="2" />

            {/* Desktop Area */}
            <path d={desktopAreaPath} fill="url(#fillDesktop)" />
            <path d={desktopLinePath} fill="none" stroke="var(--chart-1)" strokeWidth="2" />

            {/* Hover Vertical Guide Line & Dots */}
            {hovered && (
              <g>
                <line
                  x1={hovered.x}
                  y1={paddingY}
                  x2={hovered.x}
                  y2={paddingY + plotHeight}
                  stroke="var(--border)"
                  strokeWidth="1.5"
                />
                <circle
                  cx={hovered.x}
                  cy={hovered.totalY}
                  r="4.5"
                  fill="var(--card)"
                  stroke="var(--chart-1)"
                  strokeWidth="2.5"
                />
                <circle
                  cx={hovered.x}
                  cy={hovered.mobileY}
                  r="4"
                  fill="var(--card)"
                  stroke="var(--chart-2)"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hovered && (
            <div
              className="absolute z-20 pointer-events-none rounded-lg border border-border bg-card/95 px-3.5 py-2.5 text-sm shadow-md backdrop-blur-xs transition-transform duration-75"
              style={{
                left: `${(hovered.x / width) * 100}%`,
                top: "10px",
                transform: hovered.x > width * 0.75 ? "translateX(-105%)" : "translateX(10px)",
              }}
            >
              <div className="font-semibold text-foreground mb-1.5">
                {new Date(hovered.d.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
                    Desktop:
                  </span>
                  <span className="font-mono font-bold text-foreground">{hovered.d.desktop}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
                    Mobile:
                  </span>
                  <span className="font-mono font-bold text-foreground">{hovered.d.mobile}</span>
                </div>
              </div>
            </div>
          )}

          {/* X Axis Date Labels */}
          <div className="flex justify-between px-4 pt-2 text-xs text-muted-foreground font-medium">
            {points
              .filter((_, idx) => idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1)
              .map((p, i) => (
                <span key={i}>
                  {new Date(p.d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
