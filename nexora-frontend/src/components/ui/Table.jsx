export default function Table({ columns = [], data = [], rowKey = "id" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left py-3 pr-6 last:pr-0 text-xs font-medium text-muted tracking-wider uppercase"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr
              key={row[rowKey]}
              className="group border-t border-border transition-colors hover:bg-bg/60"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="py-3.5 pr-6 last:pr-0 text-sm text-text"
                >
                  {col.render
                    ? col.render(row[col.key], row)
                    : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}