import { CsvImport } from "@/components/import/CsvImport"

export default function ImportPage() {
  return (
    <div className="import-page">
      <header className="import-header">
        <h1 className="import-title">CSV Import</h1>
      </header>
      <CsvImport />
    </div>
  )
}
