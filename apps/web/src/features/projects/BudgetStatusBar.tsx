/**
 * BudgetStatusBar Component
 * 
 * Displays a highly accessible budget utilization progress bar with color-coded
 * status indicators and formatted currency values.
 * 
 * Supports both Light Mode (#F8FAFC) and Dark Mode (#0F172A) with WCAG AAA
 * contrast standards for outdoor visibility in field operations.
 * 
 * Color Logic (SRS 3.3.1):
 * - Green (Emerald-500): 0-85% utilized (Healthy/Stable)
 * - Yellow (Amber-500): 86-100% utilized (Warning threshold)
 * - Red (Red-500): >100% utilized (Critical overspent)
 */

interface BudgetStatusBarProps {
  /** Budget allocated in USD cents or full dollars */
  allocated: number;
  /** Budget spent to date in USD cents or full dollars */
  spent: number;
}

/**
 * Formats a numeric value as USD currency using Intl API
 * @param value - Number to format
 * @returns Formatted string (e.g., "$15,000.00")
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Determines the color and status based on budget utilization percentage
 * @param utilizationPercent - Calculated percentage (spent / allocated * 100)
 * @returns Color classes and status label
 */
function getUtilizationStatus(utilizationPercent: number) {
  if (utilizationPercent > 100) {
    return {
      barColor: 'bg-red-500',
      statusLabel: 'Over Budget',
      statusBadgeColor: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    };
  }
  if (utilizationPercent >= 86) {
    return {
      barColor: 'bg-amber-500',
      statusLabel: 'At Threshold',
      statusBadgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    };
  }
  return {
    barColor: 'bg-emerald-500',
    statusLabel: 'Healthy',
    statusBadgeColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  };
}

export default function BudgetStatusBar({ allocated, spent }: BudgetStatusBarProps) {
  // Defensive programming: validate inputs
  const safeAllocated = typeof allocated === 'number' && allocated >= 0 ? allocated : 0;
  const safeSpent = typeof spent === 'number' && spent >= 0 ? spent : 0;

  // Prevent division by zero
  const utilizationPercent = safeAllocated > 0
    ? Math.round((safeSpent / safeAllocated) * 100)
    : 0;

  // Cap visual bar at 100% to prevent overflow
  const barWidth = Math.min(utilizationPercent, 100);

  const { barColor, statusLabel, statusBadgeColor } = getUtilizationStatus(utilizationPercent);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Header with status label and percentage */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Budget Utilization
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadgeColor}`}>
            {statusLabel}
          </span>
          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
            {utilizationPercent}%
          </span>
        </div>
      </div>

      {/* Progress bar container */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%` }}
          role="progressbar"
          aria-valuenow={utilizationPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Budget utilization: ${utilizationPercent}% of allocated budget`}
        />
      </div>

      {/* Currency breakdown row */}
      <div className="grid grid-cols-3 gap-3 mt-1 text-[11px]">
        <div className="space-y-0.5">
          <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">
            Allocated
          </span>
          <span className="text-slate-800 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(safeAllocated)}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">
            Spent
          </span>
          <span className="text-slate-800 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(safeSpent)}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">
            Remaining
          </span>
          <span className="text-slate-800 dark:text-slate-100 font-extrabold text-xs">
            {formatCurrency(Math.max(0, safeAllocated - safeSpent))}
          </span>
        </div>
      </div>
    </div>
  );
}