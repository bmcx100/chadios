"use client"

import { useState, useCallback, useRef } from "react"
import Papa from "papaparse"
import { createClient } from "@/lib/supabase/client"
import { TOURNAMENT_ID } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react"

type ImportType = "schedule" | "results" | "standings"

interface ParsedRow {
  [key: string]: string
}

interface ValidationError {
  row: number
  message: string
}

const REQUIRED_COLUMNS: Record<ImportType, string[]> = {
  schedule: ["date", "time", "venue", "home_team", "away_team"],
  results: ["date", "home_team", "away_team", "home_score", "away_score"],
  standings: ["team_name", "wins", "losses", "ties", "points", "gp"],
}

const ALL_COLUMNS: Record<ImportType, string[]> = {
  schedule: ["game_number", "date", "time", "venue", "home_team", "away_team", "pool"],
  results: [
    "game_number", "date", "home_team", "away_team",
    "home_score", "away_score", "home_period_scores", "away_period_scores",
  ],
  standings: ["team_name", "wins", "losses", "ties", "otl", "points", "gp"],
}

export function CsvImport() {
  const [importType, setImportType] = useState<ImportType | "">("")
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState("")
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [parseError, setParseError] = useState("")
  const [importing, setImporting] = useState(false)
  const [success, setSuccess] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setParsedData([])
    setFileName("")
    setErrors([])
    setParseError("")
    setSuccess("")
  }, [])

  const validateData = useCallback((data: ParsedRow[], type: ImportType): ValidationError[] => {
    const validationErrors: ValidationError[] = []
    const required = REQUIRED_COLUMNS[type]

    const headers = Object.keys(data[0] || {}).map(h => h.trim().toLowerCase())
    const missingCols = required.filter(col => !headers.includes(col))
    if (missingCols.length > 0) {
      validationErrors.push({
        row: 0,
        message: `Missing required columns: ${missingCols.join(", ")}`,
      })
      return validationErrors
    }

    data.forEach((row, i) => {
      const rowNum = i + 2

      required.forEach(col => {
        const val = row[col]?.trim()
        if (!val) {
          validationErrors.push({ row: rowNum, message: `Row ${rowNum}: "${col}" is empty` })
        }
      })

      if (type === "schedule") {
        const dateVal = row.date?.trim()
        if (dateVal && !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
          validationErrors.push({ row: rowNum, message: `Row ${rowNum}: "date" must be YYYY-MM-DD format` })
        }
        const timeVal = row.time?.trim()
        if (timeVal && !/^\d{1,2}:\d{2}$/.test(timeVal)) {
          validationErrors.push({ row: rowNum, message: `Row ${rowNum}: "time" must be HH:MM format` })
        }
      }

      if (type === "results") {
        const hs = row.home_score?.trim()
        const as = row.away_score?.trim()
        if (hs && isNaN(parseInt(hs))) {
          validationErrors.push({ row: rowNum, message: `Row ${rowNum}: "home_score" must be a number` })
        }
        if (as && isNaN(parseInt(as))) {
          validationErrors.push({ row: rowNum, message: `Row ${rowNum}: "away_score" must be a number` })
        }
      }

      if (type === "standings") {
        const intFields = ["wins", "losses", "ties", "points", "gp"]
        intFields.forEach(field => {
          const val = row[field]?.trim()
          if (val && isNaN(parseInt(val))) {
            validationErrors.push({ row: rowNum, message: `Row ${rowNum}: "${field}" must be a number` })
          }
        })
      }
    })

    return validationErrors
  }, [])

  const handleFile = useCallback((file: File) => {
    if (!importType) return

    resetState()
    setFileName(file.name)

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(`CSV parse error: ${results.errors[0].message} (row ${results.errors[0].row})`)
          return
        }

        if (results.data.length === 0) {
          setParseError("CSV file is empty or contains only headers")
          return
        }

        const validationErrors = validateData(results.data, importType as ImportType)
        setErrors(validationErrors)
        setParsedData(results.data)
      },
      error: (err) => {
        setParseError(`Failed to read file: ${err.message}`)
      },
    })
  }, [importType, resetState, validateData])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const findOrCreateTeam = async (
    supabase: ReturnType<typeof createClient>,
    teamName: string
  ): Promise<string> => {
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .eq("name", teamName)
      .limit(1)
      .single()

    if (existing) return existing.id

    const { data: created, error } = await supabase
      .from("teams")
      .insert({ name: teamName, is_shell: true })
      .select("id")
      .single()

    if (error || !created) throw new Error(`Failed to create team "${teamName}": ${error?.message}`)
    return created.id
  }

  const importSchedule = async (data: ParsedRow[]) => {
    const supabase = createClient()
    let imported = 0

    for (const row of data) {
      const homeTeamId = await findOrCreateTeam(supabase, row.home_team.trim())
      const awayTeamId = await findOrCreateTeam(supabase, row.away_team.trim())

      const datetime = `${row.date.trim()}T${row.time.trim()}:00`

      const { error } = await supabase.from("games").insert({
        tournament_id: TOURNAMENT_ID,
        game_number: row.game_number?.trim() || null,
        stage: "pool_play",
        start_datetime: datetime,
        venue: row.venue.trim(),
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        status: "scheduled",
      })

      if (error) throw new Error(`Failed to import game: ${error.message}`)
      imported++
    }

    return imported
  }

  const importResults = async (data: ParsedRow[]) => {
    const supabase = createClient()
    let imported = 0

    for (const row of data) {
      const homeTeamId = await findOrCreateTeam(supabase, row.home_team.trim())
      const awayTeamId = await findOrCreateTeam(supabase, row.away_team.trim())

      const homeScore = parseInt(row.home_score.trim())
      const awayScore = parseInt(row.away_score.trim())

      const homePeriodScores = row.home_period_scores?.trim()
        ? row.home_period_scores.split(",").map(s => parseInt(s.trim()))
        : null
      const awayPeriodScores = row.away_period_scores?.trim()
        ? row.away_period_scores.split(",").map(s => parseInt(s.trim()))
        : null

      // Try to match existing game by date + teams
      const dateStr = row.date.trim()
      const { data: existingGames } = await supabase
        .from("games")
        .select("id")
        .eq("tournament_id", TOURNAMENT_ID)
        .eq("home_team_id", homeTeamId)
        .eq("away_team_id", awayTeamId)
        .gte("start_datetime", `${dateStr}T00:00:00`)
        .lte("start_datetime", `${dateStr}T23:59:59`)
        .limit(1)

      if (existingGames && existingGames.length > 0) {
        const { error } = await supabase
          .from("games")
          .update({
            final_score_home: homeScore,
            final_score_away: awayScore,
            goals_by_period_home: homePeriodScores,
            goals_by_period_away: awayPeriodScores,
            result_type: "regulation",
            status: "completed",
          })
          .eq("id", existingGames[0].id)

        if (error) throw new Error(`Failed to update game: ${error.message}`)
      } else {
        const { error } = await supabase.from("games").insert({
          tournament_id: TOURNAMENT_ID,
          stage: "pool_play",
          start_datetime: `${dateStr}T00:00:00`,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          final_score_home: homeScore,
          final_score_away: awayScore,
          goals_by_period_home: homePeriodScores,
          goals_by_period_away: awayPeriodScores,
          result_type: "regulation",
          status: "completed",
        })

        if (error) throw new Error(`Failed to import result: ${error.message}`)
      }
      imported++
    }

    return imported
  }

  const importStandings = async (data: ParsedRow[]) => {
    // Standings import is informational — ensure teams exist
    // The actual standings are computed from game results,
    // so this mainly creates shell teams if they don't exist
    const supabase = createClient()
    let imported = 0

    for (const row of data) {
      await findOrCreateTeam(supabase, row.team_name.trim())
      imported++
    }

    return imported
  }

  const handleImport = async () => {
    if (!importType || parsedData.length === 0) return

    setImporting(true)
    setSuccess("")
    setParseError("")

    try {
      let count = 0
      switch (importType) {
        case "schedule":
          count = await importSchedule(parsedData)
          break
        case "results":
          count = await importResults(parsedData)
          break
        case "standings":
          count = await importStandings(parsedData)
          break
      }

      setSuccess(`Successfully imported ${count} ${importType === "standings" ? "teams" : "games"}.`)
      setParsedData([])
      setFileName("")
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const hasBlockingErrors = errors.some(e => e.row === 0)
  const columns = importType ? ALL_COLUMNS[importType] : []
  const displayColumns = columns.filter(col => {
    if (parsedData.length === 0) return true
    const headers = Object.keys(parsedData[0])
    return headers.includes(col)
  })

  return (
    <div className="import-content">
      {/* Step 1: Select data type */}
      <div className="import-step">
        <span className="import-step__label">1. Select data type</span>
        <Select
          value={importType}
          onValueChange={(val: ImportType) => {
            setImportType(val)
            resetState()
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose what to import..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="schedule">Schedule</SelectItem>
            <SelectItem value="results">Results</SelectItem>
            <SelectItem value="standings">Standings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: Upload CSV */}
      {importType && (
        <div className="import-step">
          <span className="import-step__label">2. Upload CSV file</span>
          <div
            className={`import-dropzone ${isDragging ? "import-dropzone--active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {fileName ? (
              <>
                <FileText className="import-dropzone__icon" />
                <span className="import-dropzone__filename">{fileName}</span>
                <span className="import-dropzone__text">
                  {parsedData.length} rows parsed
                </span>
              </>
            ) : (
              <>
                <Upload className="import-dropzone__icon" />
                <span className="import-dropzone__text">
                  Drop a CSV file here or tap to select
                </span>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
          />
          <p className="text-xs text-muted-foreground">
            Required columns: {REQUIRED_COLUMNS[importType].join(", ")}
          </p>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="import-error">
              {errors.length} validation {errors.length === 1 ? "error" : "errors"} found:
            </span>
            <ul className="import-error__list">
              {errors.slice(0, 10).map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
              {errors.length > 10 && (
                <li>...and {errors.length - 10} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="import-success">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Step 3: Preview */}
      {parsedData.length > 0 && (
        <div className="import-preview">
          <div className="import-preview__title">
            <span>3. Preview</span>
            <span className="import-preview__count">{parsedData.length} rows</span>
          </div>
          <div className="import-preview__table-wrap">
            <Table className="import-preview__table">
              <TableHeader>
                <TableRow>
                  {displayColumns.map(col => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    {displayColumns.map(col => (
                      <TableCell key={col}>{row[col] || ""}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {parsedData.length > 20 && (
                  <TableRow>
                    <TableCell
                      colSpan={displayColumns.length}
                      className="text-center text-muted-foreground"
                    >
                      ...{parsedData.length - 20} more rows
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Button
            onClick={handleImport}
            disabled={importing || hasBlockingErrors}
            className="w-full"
          >
            {importing ? "Importing..." : `Confirm Import (${parsedData.length} rows)`}
          </Button>
        </div>
      )}
    </div>
  )
}
