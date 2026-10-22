import { useRef, useState } from "react";

type FormTextRow = {
  id: number;
  text: string;
};

export function useFormTextRows() {
  const [rows, setRows] = useState<FormTextRow[]>([{ id: 0, text: "" }]);
  const rowId = useRef(0);

  const addRow = () => {
    rowId.current++;
    const newRow = { id: rowId.current, text: "" };
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
