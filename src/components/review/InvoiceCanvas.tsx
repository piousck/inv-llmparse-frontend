import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  Columns2,
  Rows,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { InvoiceDetail, InvoicePageImage } from '../../types/api';
import { generateInvoiceDocumentSvg } from '../../services/documentAssets';
import { cn } from '../../lib/utils';

interface InvoiceCanvasProps {
  invoice: InvoiceDetail;
  onDocumentChange?: (file: File) => void;
  onDownload?: () => void;
  selectedLineItemId?: string;
  reviewBoxes?: any[];
  onAssignBoxToField?: (boxId: string, field: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const BASE_DOC_WIDTH = 700;

export const InvoiceCanvas: React.FC<InvoiceCanvasProps> = ({
  invoice,
  onDocumentChange,
  onDownload,
  isExpanded = false,
  onToggleExpand,
}) => {
  // Zoom & Auto-Fit state: default to 'width' so the invoice width fills the window cleanly
  const [autoFitMode, setAutoFitMode] = useState<'page' | 'width' | 'manual'>('width');
  const [documentAspectRatio, setDocumentAspectRatio] = useState<number>(1.414); // A4 default (height/width)
  const [zoom, setZoom] = useState<number>(0.65); // initial sensible default while measuring
  const [customDocumentUrl, setCustomDocumentUrl] = useState<string | null>(null);
  const [customDocumentType, setCustomDocumentType] = useState<'pdf' | 'image' | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Multi-page layout mode: continuous (all stacked), side-by-side (2 columns), or single page
  const [layoutMode, setLayoutMode] = useState<'continuous' | 'side-by-side' | 'single'>('continuous');
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isPageMenuOpen, setIsPageMenuOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine all available pages
  const pagesList: InvoicePageImage[] = useMemo(() => {
    if (customDocumentUrl) {
      return [{ page: 1, image_url: customDocumentUrl }];
    }
    if (invoice.pages && invoice.pages.length > 0) {
      return invoice.pages;
    }
    if (invoice.page_image_url) {
      return [{ page: 1, image_url: invoice.page_image_url }];
    }
    if (invoice.document_url) {
      return [{ page: 1, image_url: invoice.document_url }];
    }
    return [{ page: 1, image_url: generateInvoiceDocumentSvg(invoice) }];
  }, [customDocumentUrl, invoice]);

  const hasMultiplePages = pagesList.length > 1;

  // Single active document url for PDF or single-page fallbacks
  const effectiveDocumentUrl = useMemo(() => {
    if (customDocumentUrl) return customDocumentUrl;
    if (pagesList[activePageIndex]?.image_url) return pagesList[activePageIndex].image_url;
    if (invoice.page_image_url) return invoice.page_image_url;
    if (invoice.document_url) return invoice.document_url;
    return generateInvoiceDocumentSvg(invoice);
  }, [customDocumentUrl, pagesList, activePageIndex, invoice]);

  const effectivePdfUrl = useMemo(() => {
    if (customDocumentUrl && customDocumentType === 'pdf') return customDocumentUrl;
    if (
      invoice.document_url &&
      (invoice.document_type === 'pdf' ||
        invoice.document_url.toLowerCase().includes('.pdf') ||
        invoice.document_url.startsWith('blob:'))
    ) {
      return invoice.document_url;
    }
    return null;
  }, [customDocumentUrl, customDocumentType, invoice.document_url, invoice.document_type]);

  const effectiveType =
    customDocumentType ||
    invoice.document_type ||
    (effectiveDocumentUrl.endsWith('.pdf') ? 'pdf' : 'image');

  // Default to 'image' view so high-resolution rasterized page images scale responsively without iframe clipping
  const [viewMode, setViewMode] = useState<'image' | 'pdf'>('image');

  useEffect(() => {
    if (pagesList.length > 1 && !customDocumentType) {
      setViewMode('image');
    }
  }, [pagesList.length, customDocumentType]);

  const calculateFitZoom = useCallback(
    (mode: 'page' | 'width') => {
      if (!containerRef.current) return 0.62;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      if (!containerWidth || !containerHeight) return 0.62;

      const paddingX = 32;
      const paddingY = 48; // room for padding and page header pill
      const availWidth = Math.max(160, containerWidth - paddingX);
      const availHeight = Math.max(160, containerHeight - paddingY);

      const effectiveAvailWidth =
        hasMultiplePages && layoutMode === 'side-by-side'
          ? Math.max(160, (availWidth - 24) / 2)
          : availWidth;

      const docHeight = BASE_DOC_WIDTH * documentAspectRatio;

      if (mode === 'page') {
        const scaleW = effectiveAvailWidth / BASE_DOC_WIDTH;
        const scaleH = availHeight / docHeight;
        const optimal = Math.min(scaleW, scaleH);
        return Math.max(0.25, Math.min(1.5, +optimal.toFixed(2)));
      } else {
        const scaleW = effectiveAvailWidth / BASE_DOC_WIDTH;
        return Math.max(0.25, Math.min(2.0, +scaleW.toFixed(2)));
      }
    },
    [hasMultiplePages, layoutMode, documentAspectRatio]
  );

  // ResizeObserver to automatically adjust zoom when canvas container resizes or toggles expand
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (autoFitMode !== 'manual') {
        const fit = calculateFitZoom(autoFitMode);
        setZoom(fit);
      }
    };

    handleResize();

    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [autoFitMode, calculateFitZoom, isExpanded]);

  // When a new invoice is loaded, automatically reset to Fit Width and Image View
  useEffect(() => {
    setAutoFitMode('width');
    setViewMode('image');
    if (containerRef.current) {
      const fit = calculateFitZoom('width');
      setZoom(fit);
    }
  }, [invoice.id, calculateFitZoom]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = +(img.naturalHeight / img.naturalWidth).toFixed(3);
      if (Math.abs(ratio - documentAspectRatio) > 0.05) {
        setDocumentAspectRatio(ratio);
      }
    }
  };

  const handleZoomIn = () => {
    setAutoFitMode('manual');
    setZoom((z) => Math.min(2.5, +(z + 0.10).toFixed(2)));
  };

  const handleZoomOut = () => {
    setAutoFitMode('manual');
    setZoom((z) => Math.max(0.25, +(z - 0.10).toFixed(2)));
  };

  const handleResetZoom = () => {
    setAutoFitMode('width');
    const fit = calculateFitZoom('width');
    setZoom(fit);
  };

  const handleFileSelect = (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const url = URL.createObjectURL(file);
    setCustomDocumentUrl(url);
    setCustomDocumentType(isPdf ? 'pdf' : 'image');
    setViewMode(isPdf ? 'pdf' : 'image');
    if (onDocumentChange) onDocumentChange(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const downloadUrl = invoice.document_url || effectiveDocumentUrl;
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      const ext = effectiveType === 'pdf' ? '.pdf' : '.png';
      link.download = `invoice_${invoice.invoice_number || invoice.id || 'document'}${ext}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handlePrevPage = () => {
    setActivePageIndex((idx) => Math.max(0, idx - 1));
  };

  const handleNextPage = () => {
    setActivePageIndex((idx) => Math.min(pagesList.length - 1, idx + 1));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col h-full bg-card rounded-xl border shadow-xs overflow-hidden transition-colors ${
        isDragOver ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      {/* Hidden file input for document replacement */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp"
        className="hidden"
      />

      {/* Canvas Header / Flat 38px Toolbar */}
      <div className="h-10 shrink-0 px-3 border-b border-border bg-card/90 backdrop-blur-xs flex items-center justify-between gap-1.5 select-none">
        {/* Left: Title + Page Jump Dropdown */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground shrink-0">
            {effectiveType === 'pdf' ? (
              <FileText className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
            )}
            <span className="truncate">Original Document</span>
          </div>

          {/* Page quick-jump dropdown if multi-page */}
          {hasMultiplePages && (
            <div className="relative shrink-0 flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={activePageIndex === 0}
                className="size-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsPageMenuOpen(!isPageMenuOpen)}
                className="h-6.5 px-2 rounded-md bg-muted/80 hover:bg-muted text-foreground border border-border/80 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Jump to invoice page"
              >
                <span>Page {activePageIndex + 1} of {pagesList.length}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={activePageIndex === pagesList.length - 1}
                className="size-6 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {isPageMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg p-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setIsPageMenuOpen(false)}
                >
                  <div className="px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Select Page
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 mt-0.5">
                    {pagesList.map((p, idx) => (
                      <button
                        key={p.page || idx}
                        type="button"
                        onClick={() => {
                          setActivePageIndex(idx);
                          setIsPageMenuOpen(false);
                          const el = document.getElementById(`invoice-page-${p.page}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between cursor-pointer transition-colors",
                          activePageIndex === idx ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="font-mono">Page {p.page}</span>
                        {activePageIndex === idx && <Check className="w-3 h-3 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Flattened Icon Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Multi-Page Layout Mode Icon Toggle (Continuous, Side-by-Side, Single) */}
          {hasMultiplePages && viewMode === 'image' && (
            <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border/60">
              <button
                type="button"
                onClick={() => setLayoutMode('continuous')}
                className={cn(
                  "size-6 inline-flex items-center justify-center rounded cursor-pointer transition-all",
                  layoutMode === 'continuous' ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Stacked: Scroll all pages vertically"
              >
                <Rows className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('side-by-side')}
                className={cn(
                  "size-6 inline-flex items-center justify-center rounded cursor-pointer transition-all",
                  layoutMode === 'side-by-side' ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Side-by-Side: View 2 columns"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('single')}
                className={cn(
                  "size-6 inline-flex items-center justify-center rounded cursor-pointer transition-all",
                  layoutMode === 'single' ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
                title="Single Page view"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Format Toggle for PDFs (PDF vs Image) */}
          {Boolean(effectivePdfUrl) && (
            <button
              type="button"
              onClick={() => setViewMode(v => v === 'pdf' ? 'image' : 'pdf')}
              className="h-6.5 px-2 rounded-md border border-border/80 bg-muted/60 hover:bg-muted text-[10px] font-mono font-bold text-foreground cursor-pointer"
              title={viewMode === 'pdf' ? "Switch to Rendered Image View" : "Switch to Native PDF Browser Viewer"}
            >
              {viewMode === 'pdf' ? 'Native PDF' : 'Image View'}
            </button>
          )}

          {/* Auto-Fit Toggle: Fit Width vs Fit Page */}
          <button
            type="button"
            onClick={() => {
              const nextMode = autoFitMode === 'width' ? 'page' : 'width';
              setAutoFitMode(nextMode);
              setZoom(calculateFitZoom(nextMode));
            }}
            className="h-6.5 px-2 rounded-md border border-border/80 bg-muted/60 hover:bg-muted text-[11px] font-medium text-foreground cursor-pointer"
            title={autoFitMode === 'width' ? "Fit Full Page" : "Fit Window Width"}
          >
            {autoFitMode === 'width' ? 'Fit W' : 'Fit P'}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border/60">
            <button
              type="button"
              onClick={handleZoomOut}
              className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[11px] font-mono w-9 text-center font-bold text-foreground select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Load / Replace Document */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="size-6.5 inline-flex items-center justify-center rounded-md border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Load your own document / PDF"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Download Original Document */}
          <button
            type="button"
            onClick={handleDownload}
            className="size-6.5 inline-flex items-center justify-center rounded-md border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Download document"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Expand / Collapse Canvas Button */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="size-6.5 inline-flex items-center justify-center rounded-md border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              title={isExpanded ? 'Restore Normal Width' : 'Expand Document Canvas'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Document Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-200/70 dark:bg-slate-950/80 relative"
      >
        {viewMode === 'pdf' && effectivePdfUrl ? (
          /* Native PDF Viewer Mode */
          <div
            style={{
              width: `${Math.round(BASE_DOC_WIDTH * zoom)}px`,
              height: `${Math.round(BASE_DOC_WIDTH * documentAspectRatio * zoom)}px`,
              maxWidth: '100%',
              transition: 'width 0.12s ease-out, height 0.12s ease-out',
            }}
            className="rounded-xl shadow-2xl overflow-hidden border border-border bg-white"
          >
            <iframe
              src={`${effectivePdfUrl}#toolbar=0&navpanes=0&view=Fit`}
              title="Original Invoice PDF Document"
              className="w-full h-full border-0"
            />
          </div>
        ) : hasMultiplePages && layoutMode === 'continuous' ? (
          /* Multi-Page: Continuous Vertical Stack (Both Pages Together) */
          <div className="flex flex-col gap-6 items-center w-full pb-10">
            {pagesList.map((p) => (
              <div key={p.page} id={`invoice-page-${p.page}`} className="flex flex-col items-center w-full">
                <div className="text-xs font-mono font-bold text-muted-foreground bg-card/90 backdrop-blur-xs px-3.5 py-1 rounded-full mb-2.5 flex items-center gap-2 shadow-sm border border-border">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="font-extrabold text-foreground">Page {p.page}</span>
                  <span className="text-muted-foreground">of {pagesList.length}</span>
                  {p.page === 1 ? (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">Line Items</span>
                  ) : (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">Totals & Summary</span>
                  )}
                </div>
                <div
                  style={{
                    width: `${Math.round(BASE_DOC_WIDTH * zoom)}px`,
                    maxWidth: '100%',
                    transition: 'width 0.12s ease-out',
                  }}
                  className="relative rounded-lg shadow-xl border border-slate-300 dark:border-slate-700 bg-white select-none overflow-hidden"
                >
                  <img
                    src={p.image_url}
                    alt={`Invoice Page ${p.page}`}
                    onLoad={handleImageLoad}
                    className="w-full h-auto block pointer-events-none"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : hasMultiplePages && layoutMode === 'side-by-side' ? (
          /* Multi-Page: Side-by-Side Comparison */
          <div className="flex gap-4 items-start justify-center pb-10 flex-wrap lg:flex-nowrap">
            {pagesList.map((p) => (
              <div key={p.page} className="flex flex-col items-center">
                <div className="text-xs font-mono font-bold text-muted-foreground bg-card/90 backdrop-blur-xs px-3.5 py-1 rounded-full mb-2.5 flex items-center gap-2 shadow-sm border border-border">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="font-extrabold text-foreground">Page {p.page}</span>
                  <span className="text-muted-foreground">of {pagesList.length}</span>
                  {p.page === 1 ? (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">Line Items</span>
                  ) : (
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">Totals & Summary</span>
                  )}
                </div>
                <div
                  style={{
                    width: `${Math.round(BASE_DOC_WIDTH * zoom)}px`,
                    maxWidth: '100%',
                    transition: 'width 0.12s ease-out',
                  }}
                  className="relative rounded-lg shadow-xl border border-slate-300 dark:border-slate-700 bg-white select-none overflow-hidden"
                >
                  <img
                    src={p.image_url}
                    alt={`Invoice Page ${p.page}`}
                    onLoad={handleImageLoad}
                    className="w-full h-auto block pointer-events-none"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single Page View */
          <div className="flex flex-col items-center w-full pb-8">
            {hasMultiplePages && (
              <div className="text-xs font-mono font-bold text-muted-foreground bg-card/90 backdrop-blur-xs px-3.5 py-1 rounded-full mb-2.5 flex items-center gap-2 shadow-sm border border-border">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="font-extrabold text-foreground">Page {activePageIndex + 1}</span>
                <span className="text-muted-foreground">of {pagesList.length}</span>
              </div>
            )}
            <div
              style={{
                width: `${Math.round(BASE_DOC_WIDTH * zoom)}px`,
                maxWidth: '100%',
                transition: 'width 0.12s ease-out',
              }}
              className="relative rounded-lg shadow-2xl border border-slate-300 dark:border-slate-700 bg-white select-none overflow-hidden"
            >
              <img
                src={pagesList[activePageIndex]?.image_url || effectiveDocumentUrl}
                alt={`Invoice Document Page ${activePageIndex + 1}`}
                onLoad={handleImageLoad}
                className="w-full h-auto block pointer-events-none"
              />
            </div>
          </div>
        )}

        {/* Drag Over Banner Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-card border border-primary p-6 rounded-2xl shadow-2xl text-center">
              <Upload className="w-10 h-10 text-primary mx-auto mb-2 animate-bounce" />
              <p className="font-extrabold text-foreground text-sm">Drop PDF or Invoice Image Here</p>
              <p className="text-xs text-muted-foreground mt-0.5">Will render directly onto document canvas</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
