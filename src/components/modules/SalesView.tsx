import React from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MOCK_SALES_ITEMS } from '../../services/mockData';
import { formatCurrency } from '../../lib/utils';

interface SalesViewProps {
  onShowToast: (msg: string) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ onShowToast }) => {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col bg-background gap-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
          Sales Invoices & Revenue Recognition
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Parse outgoing sales invoices, debtor notes, and Irish sales VAT with the same visual AI engine.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Sales Ingestion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Sales Batch Import</CardTitle>
            <Badge variant="success">AI Vision Ready</Badge>
          </CardHeader>
          <CardBody className="space-y-4 text-xs">
            <div
              onClick={() => onShowToast('Sales upload simulated')}
              className="border-2 border-dashed border-border hover:border-primary rounded-xl p-5 text-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-foreground">Drop Sales Invoices</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PDF, CSV, or XML batch supported</p>
              </div>
              <Button variant="primary" size="sm" className="mt-1 h-7 text-xs">
                Choose Files
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-muted/30 border border-border rounded-lg">
                <span className="text-[10px] text-muted-foreground block">Ready to Post</span>
                <span className="font-bold text-base text-foreground">18</span>
              </div>
              <div className="p-2.5 bg-muted/30 border border-border rounded-lg">
                <span className="text-[10px] text-muted-foreground block">VAT Check</span>
                <span className="font-bold text-base text-amber-600">2</span>
              </div>
              <div className="p-2.5 bg-muted/30 border border-border rounded-lg">
                <span className="text-[10px] text-muted-foreground block">In Review</span>
                <span className="font-bold text-base text-primary">4</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Sales Table Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Sales Coding & RTD Tax Distribution</CardTitle>
            <span className="text-[10px] text-muted-foreground">Current Billing Cycle</span>
          </CardHeader>
          <div className="overflow-x-auto text-[11px]">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="px-2.5 py-2">Customer / Debtor</th>
                  <th className="px-2.5 py-2 text-right">Net Value</th>
                  <th className="px-2.5 py-2 text-right">Output VAT</th>
                  <th className="px-2.5 py-2 text-center">Rate</th>
                  <th className="px-2.5 py-2">Revenue GL</th>
                  <th className="px-2.5 py-2 text-center">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {MOCK_SALES_ITEMS.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-2.5 py-2 font-bold text-foreground text-[11px]">{item.customer}</td>
                    <td className="px-2.5 py-2 text-right font-mono font-bold text-foreground text-[11px]">
                      {formatCurrency(item.net)}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-muted-foreground font-semibold text-[11px]">
                      {formatCurrency(item.vat)}
                    </td>
                    <td className="px-2.5 py-2 text-center font-mono font-semibold text-[11px]">{item.rate}</td>
                    <td className="px-2.5 py-2 font-mono font-semibold text-primary text-[11px]">{item.revenueGl}</td>
                    <td className="px-2.5 py-2 text-center font-mono font-bold text-emerald-600 text-[10px]">
                      {item.confidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-primary/5 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            <span>Customer invoicing patterns and previous VAT treatments drive revenue account code classification.</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
