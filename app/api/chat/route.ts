import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { calculateStandings } from "@/lib/standings-engine"
import { TOURNAMENT_ID } from "@/lib/constants"
import type { Game, TiebreakerRule } from "@/lib/types"

const anthropic = new Anthropic()

const tools: Anthropic.Tool[] = [
  {
    name: "get_rules",
    description:
      "Get the full tournament ruleset text. Use this when the user asks about rules, regulations, game format, tie-breaking procedures, or how the tournament works.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_standings",
    description:
      "Get current pool standings for one or all pools. Returns team rankings with W/L/T, points, goals for/against, goal differential. Use this when the user asks about standings, rankings, who is winning, playoff chances, or team performance.",
    input_schema: {
      type: "object" as const,
      properties: {
        pool_name: {
          type: "string",
          description:
            'Optional pool name to filter (e.g. "Pool A", "Pool B"). Omit for all pools.',
        },
      },
      required: [],
    },
  },
  {
    name: "get_schedule",
    description:
      "Get tournament game schedule with scores. Can filter by date or show all games. Use this when the user asks about upcoming games, past results, game times, venues, or scores.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description:
            'Optional date filter in YYYY-MM-DD format (e.g. "2026-02-13"). Omit for all games.',
        },
      },
      required: [],
    },
  },
  {
    name: "get_tiebreakers",
    description:
      "Get the tiebreaker rules in priority order. Use this when the user asks specifically about how ties are broken, tiebreaker order, or what happens when teams are tied on points.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
]

async function handleToolCall(
  name: string,
  input: Record<string, string>
): Promise<string> {
  const supabase = await createClient()

  switch (name) {
    case "get_rules": {
      const { data } = await supabase
        .from("tournaments")
        .select("ruleset_text")
        .eq("id", TOURNAMENT_ID)
        .single()

      return data?.ruleset_text ?? "No ruleset found."
    }

    case "get_standings": {
      const poolFilter = input.pool_name

      let poolQuery = supabase
        .from("pools")
        .select("id, name, advancement_count")
        .eq("tournament_id", TOURNAMENT_ID)

      if (poolFilter) {
        poolQuery = poolQuery.ilike("name", `%${poolFilter}%`)
      }

      const { data: pools } = await poolQuery

      if (!pools || pools.length === 0) return "No pools found."

      const { data: pointStructure } = await supabase
        .from("tournament_point_structure")
        .select("win_points, tie_points, loss_points")
        .eq("tournament_id", TOURNAMENT_ID)
        .single()

      const pts = pointStructure ?? {
        win_points: 2,
        tie_points: 1,
        loss_points: 0,
      }

      const { data: tiebreakerRules } = await supabase
        .from("tiebreaker_rules")
        .select("*")
        .eq("tournament_id", TOURNAMENT_ID)
        .order("priority_order")

      const results: string[] = []

      for (const pool of pools) {
        const { data: poolTeams } = await supabase
          .from("pool_teams")
          .select("team_id, teams(name)")
          .eq("pool_id", pool.id)

        const { data: games } = await supabase
          .from("games")
          .select(
            "*, home_team:teams!games_home_team_id_fkey(id, name), away_team:teams!games_away_team_id_fkey(id, name)"
          )
          .eq("pool_id", pool.id)

        if (!poolTeams || !games) continue

        const teamList = poolTeams.map((pt: Record<string, unknown>) => ({
          teamId: pt.team_id as string,
          teamName:
            (pt.teams as Record<string, string>)?.name ?? "Unknown",
        }))

        const standings = calculateStandings(
          teamList,
          games as unknown as Game[],
          (tiebreakerRules ?? []) as unknown as TiebreakerRule[],
          pts,
          5
        )

        let table = `${pool.name} (top ${pool.advancement_count} advance):\n`
        table += "Rank | Team | GP | W | L | T | PTS | GF | GA | GD\n"
        table += "-----|------|----|----|----|----|-----|----|----|----\n"
        for (const s of standings) {
          table += `${s.rank} | ${s.teamName} | ${s.gp} | ${s.w} | ${s.l} | ${s.t} | ${s.pts} | ${s.gf} | ${s.ga} | ${s.gd}`
          if (s.tiebreakerUsed) table += ` (${s.tiebreakerUsed})`
          table += "\n"
        }
        results.push(table)
      }

      return results.join("\n") || "No standings data available."
    }

    case "get_schedule": {
      const dateFilter = input.date

      let query = supabase
        .from("games")
        .select(
          "game_number, stage, start_datetime, venue, status, final_score_home, final_score_away, result_type, home_team:teams!games_home_team_id_fkey(name), away_team:teams!games_away_team_id_fkey(name), home_placeholder, away_placeholder, pool:pools(name)"
        )
        .eq("tournament_id", TOURNAMENT_ID)
        .order("start_datetime")

      if (dateFilter) {
        query = query
          .gte("start_datetime", `${dateFilter}T00:00:00`)
          .lte("start_datetime", `${dateFilter}T23:59:59`)
      }

      const { data: games } = await query

      if (!games || games.length === 0)
        return dateFilter
          ? `No games found for ${dateFilter}.`
          : "No games found."

      let result = ""
      for (const g of games as Record<string, unknown>[]) {
        const home =
          (g.home_team as Record<string, string>)?.name ??
          (g.home_placeholder as string) ??
          "TBD"
        const away =
          (g.away_team as Record<string, string>)?.name ??
          (g.away_placeholder as string) ??
          "TBD"
        const dt = new Date(g.start_datetime as string)
        const dateStr = dt.toLocaleDateString("en-CA", { timeZone: "America/Toronto" })
        const timeStr = dt.toLocaleTimeString("en-CA", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Toronto",
        })
        const pool = (g.pool as Record<string, string>)?.name ?? ""
        const gameNum = g.game_number ?? ""

        let line = `#${gameNum} ${dateStr} ${timeStr} | ${home} vs ${away}`
        if (pool) line += ` | ${pool}`
        if (g.venue) line += ` | ${g.venue}`

        if (g.status === "completed") {
          line += ` | FINAL: ${g.final_score_home}-${g.final_score_away}`
          if (g.result_type && g.result_type !== "regulation") {
            line += ` (${g.result_type})`
          }
        } else if (g.status === "in_progress") {
          line += " | IN PROGRESS"
        } else {
          line += ` | ${g.stage}`
        }

        result += line + "\n"
      }

      return result
    }

    case "get_tiebreakers": {
      const { data: rules } = await supabase
        .from("tiebreaker_rules")
        .select("priority_order, rule_type, simple_stat, description, formula_expression, formula_precision")
        .eq("tournament_id", TOURNAMENT_ID)
        .order("priority_order")

      if (!rules || rules.length === 0) return "No tiebreaker rules found."

      let result = "Tiebreaker rules (applied in order when teams are tied on points):\n\n"
      for (const r of rules) {
        result += `${r.priority_order}. ${r.description}`
        if (r.formula_expression) {
          result += ` (formula: ${r.formula_expression}, precision: ${r.formula_precision} decimals)`
        }
        result += "\n"
      }

      return result
    }

    default:
      return `Unknown tool: ${name}`
  }
}

const SYSTEM_PROMPT = `You are a tournament assistant for the DWGHA Bolts & Hearts Annual Tournament (Feb 13-15, 2026).
The user's team is the Nepean Wildcats #2859 in Pool A.

CRITICAL RULES FOR RESPONSES:
- Give the SHORTEST possible answer. One sentence or a few bullet points max.
- No filler, no "Good luck!", no extra commentary.
- Only include what was directly asked. Do not volunteer extra info.
- When referencing rules, cite the rule number briefly (e.g., "Rule 12c").
- Use the tools to fetch only the data you need.
- If you cannot find the answer from the available tools/data, or the question is about something you have no information on, respond with exactly: "I have no clue... Who am I, Chad???"`

export async function POST(req: Request) {
  const { messages } = await req.json()

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: "messages array required" }, { status: 400 })
  }

  try {
    // Initial request with tools
    let response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })

    // Handle tool use loop
    const allMessages = [...messages]

    while (response.stop_reason === "tool_use") {
      const assistantContent = response.content
      allMessages.push({ role: "assistant", content: assistantContent })

      const toolResults = []
      for (const block of assistantContent) {
        if (block.type === "tool_use") {
          const result = await handleToolCall(
            block.name,
            block.input as Record<string, string>
          )
          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: result,
          })
        }
      }

      allMessages.push({ role: "user", content: toolResults })

      response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages: allMessages,
      })
    }

    // Extract text response
    const textBlock = response.content.find((b) => b.type === "text")
    const reply = textBlock?.type === "text" ? textBlock.text : "I couldn't generate a response."

    return Response.json({ reply })
  } catch (err) {
    console.error("Chat API error:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return Response.json(
      { error: `Failed to process chat request: ${message}` },
      { status: 500 }
    )
  }
}
