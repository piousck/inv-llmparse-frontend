import { useState } from "react";
import {
  GripVertical,
  ChevronDown,
  Columns,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

export interface DocumentRow {
  id: number;
  header: string;
  type: string;
  target: string;
  limit: string;
  reviewer: string;
  status: "verified" | "pending" | "alert";
}

const defaultRows: DocumentRow[] = [
  {
    id: 1,
    header: "Cover Page & Executive Summary",
    type: "Administrative",
    target: "1",
    limit: "2",
    reviewer: "Sarah Jenkins",
    status: "verified",
  },
  {
    id: 2,
    header: "INV-2024-001 Irish Tech Supplies (Sec 60)",
    type: "Compliance",
    target: "€4,850",
    limit: "€5,000",
    reviewer: "Mark O'Connor",
    status: "alert",
  },
  {
    id: 3,
    header: "Technical Proposal - Cloud Infrastructure",
    type: "Technical",
    target: "25",
    limit: "30",
    reviewer: "David Rossi",
    status: "verified",
  },
  {
    id: 4,
    header: "INV-2024-003 Kerry Logistics 3-Way Match",
    type: "Reconciliation",
    target: "€12,340",
    limit: "€15,000",
    reviewer: "Sarah Jenkins",
    status: "verified",
  },
  {
    id: 5,
    header: "Pricing Matrix & Rate Cards",
    type: "Commercial",
    target: "10",
    limit: "15",
    reviewer: "Elena Vance",
    status: "pending",
  },
  {
    id: 6,
    header: "Security Audit & SOC2 Attestation",
    type: "Governance",
    target: "18",
    limit: "20",
    reviewer: "Mark O'Connor",
    status: "verified",
  },
  {
    id: 7,
    header: "Subcontractor Agreement - AWS EMEA",
    type: "Legal",
    target: "8",
    limit: "10",
    reviewer: "Assign reviewer",
    status: "pending",
  },
  {
    id: 8,
    header: "INV-2024-008 Dublin Office Equipment",
    type: "Procurement",
    target: "€1,820",
    limit: "€2,000",
    reviewer: "Sarah Jenkins",
    status: "verified",
  },
];

export function DataTable({ onSelectInvoice }: { onSelectInvoice?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState("outline");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<DocumentRow[]>(defaultRows);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const filteredRows = rows.filter((r) =>
    r.header.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.reviewer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRows.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleUpdateField = (id: number, field: "target" | "limit", value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      {/* Tab Navigation and Controls matching tweakcn */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        {/* Tabs list matching tweakcn */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-md border border-border/60 self-start">
          <button
            onClick={() => setActiveTab("outline")}
            className={`px-3.5 py-1.5 text-base font-medium rounded-sm transition-all cursor-pointer ${
              activeTab === "outline"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Outline
          </button>
          <button
            onClick={() => setActiveTab("past-performance")}
            className={`px-3.5 py-1.5 text-base font-medium rounded-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "past-performance"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Past Performance
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 text-xs font-bold">
              3
            </span>
          </button>
          <button
            onClick={() => setActiveTab("key-personnel")}
            className={`px-3.5 py-1.5 text-base font-medium rounded-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "key-personnel"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Key Personnel
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 text-xs font-bold">
              2
            </span>
          </button>
          <button
            onClick={() => setActiveTab("focus-documents")}
            className={`px-3.5 py-1.5 text-base font-medium rounded-sm transition-all cursor-pointer ${
              activeTab === "focus-documents"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Focus Documents
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 text-base bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-40 sm:w-52"
            />
          </div>

          <Button variant="outline" size="sm" className="h-9 text-base font-medium gap-1.5 border-border">
            <Columns className="size-4" />
            <span className="hidden lg:inline">Customize Columns</span>
            <span className="lg:hidden">Columns</span>
            <ChevronDown className="size-3.5 text-muted-foreground ml-0.5" />
          </Button>

          <Button variant="outline" size="sm" className="h-9 text-base font-medium gap-1 border-border">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Section</span>
          </Button>
        </div>
      </div>

      {/* Table Container matching shadcn Table specs */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base border-collapse">
            <thead className="bg-muted/50 border-b border-border text-foreground font-medium">
              <tr>
                <th className="w-8 py-3.5 pl-3 pr-1 text-center"></th>
                <th className="w-8 py-3.5 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === paginatedRows.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-ring cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 font-semibold">Header</th>
                <th className="py-3.5 px-4 font-semibold">Section Type</th>
                <th className="py-3.5 px-4 text-right font-semibold">Target</th>
                <th className="py-3.5 px-4 text-right font-semibold">Limit</th>
                <th className="py-3.5 px-4 font-semibold">Reviewer</th>
                <th className="w-10 py-3.5 pr-4 text-right"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {paginatedRows.map((row) => {
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-muted/50 ${
                      isSelected ? "bg-muted/30" : ""
                    }`}
                  >
                    {/* Drag Handle */}
                    <td className="py-3.5 pl-3 pr-1 text-center cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground">
                      <GripVertical className="size-4 mx-auto" />
                    </td>

                    {/* Checkbox */}
                    <td className="py-3.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(row.id)}
                        className="rounded border-border text-primary focus:ring-ring cursor-pointer"
                      />
                    </td>

                    {/* Header / Invoice Title */}
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {row.status === "verified" && (
                          <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
                        )}
                        {row.status === "alert" && (
                          <AlertTriangle className="size-4.5 text-amber-500 shrink-0" />
                        )}
                        <span
                          className="hover:underline cursor-pointer"
                          onClick={() => onSelectInvoice && onSelectInvoice("f5a2b1c0-4321-4def-9876-0fedcba98765")}
                        >
                          {row.header}
                        </span>
                      </div>
                    </td>

                    {/* Section Type Badge */}
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-sm font-normal rounded-md px-2.5 py-0.5 text-muted-foreground">
                        {row.type}
                      </Badge>
                    </td>

                    {/* Target (Editable) */}
                    <td className="py-3.5 px-4 text-right font-mono text-base">
                      <input
                        type="text"
                        value={row.target}
                        onChange={(e) => handleUpdateField(row.id, "target", e.target.value)}
                        className="h-8 w-24 text-right bg-transparent hover:bg-input/30 focus:bg-background focus:ring-1 focus:ring-ring rounded-md px-1.5 outline-none font-mono text-base"
                      />
                    </td>

                    {/* Limit (Editable) */}
                    <td className="py-3.5 px-4 text-right font-mono text-base">
                      <input
                        type="text"
                        value={row.limit}
                        onChange={(e) => handleUpdateField(row.id, "limit", e.target.value)}
                        className="h-8 w-24 text-right bg-transparent hover:bg-input/30 focus:bg-background focus:ring-1 focus:ring-ring rounded-md px-1.5 outline-none font-mono text-base"
                      />
                    </td>

                    {/* Reviewer */}
                    <td className="py-3.5 px-4 text-base">
                      {row.reviewer === "Assign reviewer" ? (
                        <span className="text-muted-foreground/70 italic hover:text-foreground cursor-pointer text-sm">
                          + Assign reviewer
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                            {row.reviewer.charAt(0)}
                          </div>
                          <span className="text-foreground font-normal">{row.reviewer}</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4 text-right">
                      <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer">
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-border bg-card text-base text-muted-foreground">
          <div className="text-base text-muted-foreground">
            {selectedIds.length} of {filteredRows.length} row(s) selected.
          </div>

          <div className="flex items-center gap-4">
            <span className="text-base font-medium text-foreground">
              Page {page} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-border"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-border"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-border"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-border"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
