import React from 'react';
import { Percent } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IRISH_VAT_RATES } from '../../types/api';
import { Badge } from '../ui/Badge';

export const VatRatesView: React.FC = () => {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col bg-background gap-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
          Irish Revenue RTD & VAT Rates Reference
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Statutory Irish Return of Trading Details (RTD) codes and VATCA 2010 rules applied during real-time document extraction.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" /> Statutory VAT Codes (Ireland VATCA 2010)
          </CardTitle>
          <Badge variant="success">Revenue Ireland Compliant</Badge>
        </CardHeader>

        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <th className="px-2.5 py-2 w-24">RTD Code</th>
                <th className="px-2.5 py-2 w-28">Statutory Rate</th>
                <th className="px-2.5 py-2">Description</th>
                <th className="px-2.5 py-2">Irish Commerce Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {IRISH_VAT_RATES.map((rate) => (
                <tr key={rate.code} className="hover:bg-muted/40 transition-colors">
                  <td className="px-2.5 py-2 font-mono font-bold text-primary text-[11px]">{rate.code}</td>
                  <td className="px-2.5 py-2 font-mono font-bold text-foreground text-[11px]">{rate.rate.toFixed(1)}%</td>
                  <td className="px-2.5 py-2 font-bold text-foreground text-[11px]">{rate.description}</td>
                  <td className="px-2.5 py-2 text-muted-foreground text-[10px]">{rate.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
