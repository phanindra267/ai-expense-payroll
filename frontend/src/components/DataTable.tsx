import React from 'react';

interface Column<T> { key: keyof T | string; label: string; render?: (row: T) => React.ReactNode; }

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

function DataTable<T extends { _id?: string; id?: string }>({ columns, data, loading, emptyMessage = 'No data found' }: Props<T>) {
  if (loading) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }
  if (!data?.length) {
    return (
      <div className="empty-state">
        <div className="emoji">📭</div>
        <h3>Nothing here yet</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>{columns.map(c => <th key={String(c.key)}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row._id || row.id || i}>
              {columns.map(c => (
                <td key={String(c.key)}>
                  {c.render ? c.render(row) : String((row as any)[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
