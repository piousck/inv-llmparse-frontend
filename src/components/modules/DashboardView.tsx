import React from "react";
import { SectionCards } from "../dashboard/SectionCards";
import { ChartAreaInteractive } from "../dashboard/ChartAreaInteractive";
import { DataTable } from "../dashboard/DataTable";
import { ChartPieDonut } from "../dashboard/ChartPieDonut";
import { ChartBarMixed } from "../dashboard/ChartBarMixed";

interface DashboardViewProps {
  onSelectInvoice?: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectInvoice }) => {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Top Metric Cards */}
          <SectionCards />

          {/* Interactive Area Chart */}
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>

          {/* Data Table */}
          <DataTable onSelectInvoice={onSelectInvoice} />

          {/* Browser / Category Charts: Donut & Mixed Bar */}
          <div className="flex flex-col md:flex-row gap-4 px-4 lg:px-6">
            <div className="w-full md:basis-1/2">
              <ChartPieDonut />
            </div>
            <div className="w-full md:basis-1/2">
              <ChartBarMixed />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
