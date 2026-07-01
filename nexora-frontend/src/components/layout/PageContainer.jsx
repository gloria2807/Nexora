export default function PageContainer({ title, subtitle, children }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-10 pt-10 pb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-text">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex-1 px-10 pb-10">
        {children}
      </div>
    </div>
  )
}
