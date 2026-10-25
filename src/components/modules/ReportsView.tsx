import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';

interface ReportsViewProps {
  onShowToast: (msg: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onShowToast }) => {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col bg-background gap-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
          Tax Returns & Financial Reporting
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Export statutory Irish VAT3 declarations, RTD return schedules, and general ledger journals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Irish VAT3 Return</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-xs">
            <p className="text-muted-foreground text-[11px]">
              T1, T2, T3 and T4 boxes auto-reconciled from approved purchase and sales invoices.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast('Exported VAT3 XML for ROS.ie')}
              className="w-full gap-1.5 h-8 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Export VAT3 (ROS)
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Annual RTD Declaration</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-xs">
            <p className="text-muted-foreground text-[11px]">
              Return of Trading Details broken down by statutory rates (T0, T9, T135, T23, TN).
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast('Exported RTD schedule (Excel)')}
              className="w-full gap-1.5 h-8 text-xs font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export RTD Schedule
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Xero Ledger Journal Batch</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-xs">
            <p className="text-muted-foreground text-[11px]">
              Approved bills ready for direct 1-click batch export into Xero Cloud Accounting.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast('Exported Xero bill batch CSV')}
              className="w-full gap-1.5 h-8 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Export Xero Bills
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Section 60 Audit Trail</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-xs">
            <p className="text-muted-foreground text-[11px]">
              Verification log of food and drink resale exceptions approved by accounting staff.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast('Exported S.60 compliance audit report')}
              className="w-full gap-1.5 h-8 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Export S.60 Audit Log
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
