import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

function DataTable({
  data = [],
  columns = [],
  isLoading = false,
  searchKey,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.'
}) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  const handleSort = (key) => {
    let direction = 'asc';

    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    }

    setSortConfig({ key, direction });
  };

  const filteredData = useMemo(() => {
    let processed = Array.isArray(data) ? [...data] : [];

    // SEARCH
    if (search && searchKey) {
      processed = processed.filter((item) => {
        const val = item?.[searchKey];
        return typeof val === 'string'
          ? val.toLowerCase().includes(search.toLowerCase())
          : false;
      });
    }

    // SORT
    if (sortConfig) {
      processed.sort((a, b) => {
        const aVal = a?.[sortConfig.key];
        const bVal = b?.[sortConfig.key];

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processed;
  }, [data, search, searchKey, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">

      {/* SEARCH */}
      {searchKey && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            placeholder={searchPlaceholder}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-matte border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-gold transition-colors"
          />
        </div>
      )}

      {/* TABLE */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">

            <thead>
              <tr className="bg-matte/50 text-[10px] text-muted uppercase tracking-widest border-b border-border">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={cn(
                      "p-4 font-semibold whitespace-nowrap",
                      col.sortable && "cursor-pointer hover:text-white transition-colors select-none"
                    )}
                    onClick={() => {
                      if (col.sortable && col.accessorKey) {
                        handleSort(col.accessorKey);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}

                      {col.sortable && col.accessorKey && (
                        sortConfig?.key === col.accessorKey ? (
                          sortConfig.direction === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="text-sm">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {columns.map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="h-4 bg-border/50 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center text-muted">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {paginatedData.map((item, i) => (
                    <motion.tr
                      key={item.id || i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.02 }}
                      className="border-b border-border hover:bg-border/30"
                    >
                      {columns.map((col, j) => (
                        <td key={j} className="p-4 whitespace-nowrap text-white">
                          {col.cell
                            ? col.cell(item)
                            : col.accessorKey
                              ? String(item[col.accessorKey] ?? '')
                              : ''}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>

          </table>
        </div>

        {/* PAGINATION */}
        {!isLoading && filteredData.length > pageSize && (
          <div className="flex items-center justify-between p-4 border-t border-border bg-matte/30">
            <p className="text-xs text-muted">
              <span className="font-bold text-white">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-white">
                {Math.min(currentPage * pageSize, filteredData.length)}
              </span>{' '}
              of{' '}
              <span className="font-bold text-white">
                {filteredData.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-border text-muted hover:text-white hover:border-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-border text-muted hover:text-white hover:border-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/**
 * IMPORTANT FIX:
 * - Default export fixes: import DataTable from ...
 * - Named export fixes: import { DataTable } from ...
 */
export default DataTable;
export { DataTable };