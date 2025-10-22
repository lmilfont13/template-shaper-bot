export const exportToCSV = (data: any[], filename: string, columns: { key: string; label: string }[]) => {
  // Criar cabeçalhos
  const headers = columns.map(col => col.label).join(',');
  
  // Criar linhas de dados
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      // Escapar vírgulas e aspas
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  }).join('\n');
  
  // Combinar cabeçalhos e linhas
  const csv = `${headers}\n${rows}`;
  
  // Criar blob e fazer download
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
