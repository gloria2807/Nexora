export default function Card({ children, className = "" }) {
  return (
    <div className={`bg-surface border border-border rounded-xl p-4 sm:p-5 lg:p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
