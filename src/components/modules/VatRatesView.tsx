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

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                <th className="px-4 py-3 w-24">RTD Code</th>
                <th className="px-4 py-3 w-28">Statutory Rate</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Irish Commerce Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {IRISH_VAT_RATES.map((rate) => (
                <tr key={rate.code} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{rate.code}</td>
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{rate.rate.toFixed(1)}%</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{rate.description}</td>
                  <td className="px-4 py-3 text-muted-foreground text-[11px]">{rate.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
