import { useRef, useState } from "react";

type FormTextRowsOptions<T extends { text: string }> = {
  initialRows: T[];
  createRow: () => T;
};

export function useFormTextRows<T extends { text: string }>({ initialRows, createRow }: FormTextRowsOptions<T>) {
  const [rows, setRows] = useState<(T & { id: number })[]>(() =>
    initialRows.map((row, index) => ({ ...row, id: index })),
  );
  const rowId = useRef(initialRows.length - 1);

  const addRow = () => {
    rowId.current++;
    const newRow = { ...createRow(), id: rowId.current };
    setRows((currentRows) => [...currentRows, newRow]);
  };

  const removeRow = (removeRowId: number) => {
    setRows((currentRows) => currentRows.filter((row) => row.id !== removeRowId));
  };

  const updateRow = (editedRowId: number, newText: string): void => {
    setRows((currentRows) => currentRows.map((row) => (row.id === editedRowId ? { ...row, text: newText } : row)));
  };

  return { rows, addRow, removeRow, updateRow };
}
